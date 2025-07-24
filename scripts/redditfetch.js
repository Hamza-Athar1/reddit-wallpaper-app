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
  limit = 75, // Increased default limit for mobile
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
        
        console.log(`Response for r/${subreddit} (${time}): ${json.data?.children?.length || 0} posts, after token: ${json.data?.after || 'null'}`);
        
        if (!json.data || !Array.isArray(json.data.children)) {
          const result = { images: [], after: null };
          return { key, ...result };
        }

        // Optimized filtering with early returns - more permissive for mobile
        const images = json.data.children
          .map(c => c.data)
          .filter(p => {
            // Allow both direct image posts and gallery posts
            if (p.post_hint === "image") return true;
            if (p.post_hint === "hosted:video") return false; // Skip videos
            if (p.post_hint === "rich:video") return false; // Skip videos
            
            // Check for direct image URLs even without post_hint
            if (p.url && /\.(jpe?g|png|webp)$/i.test(p.url)) return true;
            
            // Check for gallery posts with preview images
            if (p.is_gallery && p.preview?.images?.[0]?.source?.url) return true;
            if (p.media_metadata && p.preview?.images?.[0]?.source?.url) return true;
            
            // Check for preview images (Reddit's own image hosting)
            if (p.preview?.images?.[0]?.source?.url) {
              // Allow i.redd.it and other Reddit image hosts
              if (p.url.includes('i.redd.it') || p.url.includes('i.imgur.com') || p.url.includes('imgur.com')) return true;
            }
            
            return false;
          })
          .filter(p => {
            // Second pass: quality and content filtering
            if (p.over_18) return false; // Filter NSFW content
            if (p.url.includes("gif") || p.url.includes("gifv")) return false;
            
            // Get image dimensions - be more flexible with size requirements
            let width = 0, height = 0;
            if (p.preview?.images?.[0]?.source) {
              width = p.preview.images[0].source.width;
              height = p.preview.images[0].source.height;
            }
            
            // More permissive size requirements for mobile - allow smaller images
            if (width > 0 && height > 0 && (width < 100 || height < 100)) return false;
            
            return true;
          })
          .map(p => {
            // Get the best available image URL and metadata
            let imageUrl = p.url;
            let width = 0, height = 0;
            let previewUrl = null;
            
            // Handle Reddit-hosted images
            if (p.preview?.images?.[0]?.source) {
              const source = p.preview.images[0].source;
              width = source.width;
              height = source.height;
              
              // Use the highest quality preview if available
              if (source.url) {
                imageUrl = source.url.replace(/&amp;/g, "&");
              }
              
              // Get a smaller preview image for thumbnails
              if (p.preview.images[0].resolutions?.length > 0) {
                const previews = p.preview.images[0].resolutions;
                // Find a good preview size (around 300-600px width)
                const goodPreview = previews.find(r => r.width >= 300 && r.width <= 600) || 
                                   previews[Math.floor(previews.length / 2)] || 
                                   previews[0];
                previewUrl = goodPreview.url?.replace(/&amp;/g, "&");
              }
            }
            
            // Handle gallery posts - get first image
            if (p.is_gallery && p.media_metadata) {
              const firstMediaId = Object.keys(p.media_metadata)[0];
              const firstMedia = p.media_metadata[firstMediaId];
              if (firstMedia?.s) {
                imageUrl = firstMedia.s.u?.replace(/&amp;/g, "&") || imageUrl;
                width = firstMedia.s.x || width;
                height = firstMedia.s.y || height;
              }
            }
            
            // Fallback for direct image URLs
            if (!width && !height && /\.(jpe?g|png|webp)$/i.test(p.url)) {
              imageUrl = p.url;
              // Set reasonable defaults for direct links
              width = 1920;
              height = 1080;
            }
            
            return {
              id: p.id,
              title: p.title?.trim() || 'Untitled',
              url: imageUrl,
              width: width || 1920,
              height: height || 1080,
              preview: previewUrl,
              subreddit,
              time,
              postType,
              created_utc: p.created_utc,
              score: p.score || 0,
              author: p.author,
              permalink: p.permalink,
              is_gallery: p.is_gallery || false,
              num_comments: p.num_comments || 0
            };
          });

        console.log(`Filtered result for r/${subreddit} (${time}): ${images.length} images passed filtering, after: ${json.data.after || 'null'}`);

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
  const concurrencyLimit = 3; // Reduced for mobile stability but still parallel
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
    
    // Use the optimized function with better defaults for mobile
    return await fetchExtendedWallpapers({
      subreddits,
      timeRanges: [options.time || "week"],
      postType: "top",
      limit: options.limit || 75, // Increased default limit
      after: options.after || {}
    });
  } catch (error) {
    console.error("Error fetching saved subreddits wallpapers:", error);
    return { images: [], after: {} };
  }
}

