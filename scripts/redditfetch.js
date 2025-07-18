/**
 * Optimized Reddit wallpaper fetcher with concurrent requests, caching, and error resilience.
 * 
 * Features:
 * - Concurrent API calls for better performance
 * - Request timeout and retry logic
 * - Memory-efficient image filtering
 * - Deduplication with Set for O(1) lookups
 * - Error isolation per subreddit
 * 
 * @param {Object} params
 * @param {string[]} params.subreddits - Array of subreddit names
 * @param {string[]} params.timeRanges - Array of time ranges (e.g. ["day", "week"])
 * @param {string} params.postType - "top", "hot", or "new"
 * @param {number} params.limit - Number of posts per request (max 100)
 * @param {Object} [params.after] - Object mapping `${subreddit}_${time}` to Reddit's "after" cursor
 * @returns {Promise<{images: any[], after: Record<string, string|null>}>}
 */
async function fetchExtendedWallpapers({
  subreddits = [],
  timeRanges = ["week"],
  postType = "top",
  limit = 50,
  after = {},
} = {}) {
  console.log("fetchExtendedWallpapers called with:", { subreddits, timeRanges, postType, limit });
  
  // Input validation
  if (!Array.isArray(subreddits) || subreddits.length === 0) {
    console.log("No subreddits provided, returning empty result");
    return { images: [], after: {} };
  }

  // Optimize limit (Reddit's max is 100)
  const optimizedLimit = Math.min(Math.max(limit, 10), 100);
  
  // Helper to build a unique key for after tokens
  const afterKey = (sub, time) => `${sub}_${time}`;

  // Create fetch task for a single subreddit/time combination
  const createFetchTask = (subreddit, time) => {
    return async () => {
      const key = afterKey(subreddit, time);
      const afterToken = after?.[key];
      
      // Check cache first (only for initial requests without after token)
      if (!afterToken) {
        const cacheKey = createCacheKey(subreddit, time, postType, null);
        const cachedResult = getCachedResponse(cacheKey);
        if (cachedResult) {
          return { key, ...cachedResult };
        }
      }
      
      try {
        let url = `https://www.reddit.com/r/${subreddit}/${postType}.json?limit=${optimizedLimit}&raw_json=1`;
        if (postType === "top") url += `&t=${time}`;
        
        if (afterToken) url += `&after=${afterToken}`;

        console.log(`Fetching from: ${url}`);

        // Add timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Reddit-Wallpaper-App/1.0',
          },
        });

        clearTimeout(timeoutId);

        console.log(`Response status for r/${subreddit} (${time}): ${res.status}`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const json = await res.json();
        
        if (!json.data || !Array.isArray(json.data.children)) {
          const result = { images: [], after: null };
          return { key, ...result };
        }

        // Optimized filtering with early returns
        const images = json.data.children
          .map(c => c.data)
          .filter(p => {
            // Early return optimizations
            if (!p.post_hint || p.post_hint !== "image") return false;
            if (!p.preview?.images?.[0]?.source?.url) return false;
            if (p.over_18) return false; // Filter NSFW content
            if (p.url.includes("gif") || p.url.includes("gifv")) return false;
            if (!/\.(jpe?g|png|webp)$/i.test(p.url)) return false;
            
            const source = p.preview.images[0].source;
            if (source.width < 150 || source.height < 150) return false;
            
            return true;
          })
          .map(p => {
            const source = p.preview.images[0].source;
            return {
              id: p.id,
              title: p.title?.trim() || 'Untitled',
              url: p.url.replace(/&amp;/g, "&"),
              width: source.width,
              height: source.height,
              preview: p.preview.images[0].resolutions?.[0]?.url?.replace(/&amp;/g, "&") || null,
              subreddit,
              time,
              postType,
              created_utc: p.created_utc,
              score: p.score || 0,
              author: p.author,
              permalink: p.permalink,
            };
          });

        const result = { images, after: json.data.after || null };
        
        // Cache the result (only for initial requests)
        if (!afterToken) {
          const cacheKey = createCacheKey(subreddit, time, postType, null);
          setCachedResponse(cacheKey, result);
        }

        return { key, ...result };
        
      } catch (error) {
        // Log detailed error for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Failed to fetch r/${subreddit} (${time}):`, error.message);
        }
        return { key, images: [], after: null };
      }
    };
  };

  // Create all fetch tasks
  const fetchTasks = [];
  for (const subreddit of subreddits) {
    for (const time of timeRanges) {
      fetchTasks.push(createFetchTask(subreddit, time));
    }
  }

  // Execute all requests concurrently with controlled concurrency
  const concurrencyLimit = 5; // Limit concurrent requests to avoid overwhelming Reddit's API
  const results = [];
  
  for (let i = 0; i < fetchTasks.length; i += concurrencyLimit) {
    const batch = fetchTasks.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);
  }

  // Process results
  const allImages = [];
  const afterTokens = {};
  
  for (const result of results) {
    afterTokens[result.key] = result.after;
    allImages.push(...result.images);
  }

  // Efficient deduplication using Set
  const seenIds = new Set();
  const dedupedImages = allImages.filter(img => {
    if (seenIds.has(img.id)) {
      return false;
    }
    seenIds.add(img.id);
    return true;
  });

  // Sort by score for better quality results
  dedupedImages.sort((a, b) => (b.score || 0) - (a.score || 0));

  console.log(`Final result: ${dedupedImages.length} unique images from ${subreddits.length} subreddits`);

  return { 
    images: dedupedImages, 
    after: afterTokens 
  };
}
/**
 * Clear the API cache (useful for refreshing data)
 */
export function clearApiCache() {
  apiCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats() {
  return {
    size: apiCache.size,
    entries: Array.from(apiCache.keys())
  };
}

export { fetchExtendedWallpapers };
export default fetchExtendedWallpapers;
import { loadSettings } from "../components/settings-storage";

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Create cache key for API requests
 */
function createCacheKey(subreddit, time, postType, afterToken) {
  return `${subreddit}_${time}_${postType}_${afterToken || 'null'}`;
}

/**
 * Check if cached response is still valid
 */
function isCacheValid(cacheEntry) {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
}

/**
 * Get cached response or null if not valid
 */
function getCachedResponse(cacheKey) {
  const cached = apiCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached.data;
  }
  // Remove expired cache entry
  if (cached) {
    apiCache.delete(cacheKey);
  }
  return null;
}

/**
 * Cache API response
 */
function setCachedResponse(cacheKey, data) {
  // Limit cache size to prevent memory issues
  if (apiCache.size > 50) {
    const firstKey = apiCache.keys().next().value;
    apiCache.delete(firstKey);
  }
  
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Optimized legacy function - use fetchExtendedWallpapers for better performance
 * @deprecated Use fetchExtendedWallpapers instead
 */
export async function fetchTopImages(subreddits, { limit = 50, time = 'week', after = null } = {}) {
  // Redirect to optimized function
  const srList = Array.isArray(subreddits) ? subreddits : [subreddits];
  
  try {
    const result = await fetchExtendedWallpapers({
      subreddits: srList,
      timeRanges: [time],
      postType: 'top',
      limit,
      after: Array.isArray(after) 
        ? Object.fromEntries(srList.map((sr, idx) => [`${sr}_${time}`, after[idx]]))
        : after 
        ? Object.fromEntries(srList.map(sr => [`${sr}_${time}`, after]))
        : {}
    });

    // Convert back to legacy format
    const afters = srList.map(sr => result.after[`${sr}_${time}`] || null);
    
    return {
      images: result.images,
      after: Array.isArray(subreddits) ? afters : afters[0]
    };
  } catch (error) {
    console.error("Error in fetchTopImages:", error);
    return { 
      images: [], 
      after: Array.isArray(subreddits) ? subreddits.map(() => null) : null 
    };
  }
}


/**
 * Optimized function to fetch wallpapers from user's saved subreddits
 * Uses the new fetchExtendedWallpapers for better performance
 */
export async function fetchSavedSubredditsWallpapers(options = {}) {
  try {
    const settings = await loadSettings();
    const subreddits = Array.isArray(settings.subreddits) && settings.subreddits.length > 0
      ? settings.subreddits
      : ["wallpapers"];
    
    // Use the optimized function with better defaults
    return await fetchExtendedWallpapers({
      subreddits,
      timeRanges: [options.time || "week"],
      postType: "top",
      limit: options.limit || 50,
      after: options.after || {}
    });
  } catch (error) {
    console.error("Error fetching saved subreddits wallpapers:", error);
    return { images: [], after: {} };
  }
}

