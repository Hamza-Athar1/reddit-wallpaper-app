/**
 * Fetches wallpapers from multiple subreddits, time ranges, and post types, with pagination and deduplication.
 * @param {Object} params
 * @param {string[]} params.subreddits - Array of subreddit names.
 * @param {string[]} params.timeRanges - Array of time ranges (e.g. ["day", "week", "month"]).
 * @param {string} params.postType - "top", "hot", or "new".
 * @param {number} params.limit - Number of posts per request.
 * @param {Object} [params.after] - Optional. Object mapping `${subreddit}_${time}` to "after" tokens.
 * @returns {Promise<{images: any[], after: Record<string, string|null>}>}
 */
/**
 * Fetch a single page of wallpapers from multiple subreddits and time ranges, supporting infinite pagination.
 *
 * For each subreddit and time range, fetches the next page using the provided afterMap (Reddit's cursor).
 * Returns images and updated afterMap for each subreddit/time combo.
 *
 * Usage pattern (frontend):
 *   - On mount: call with after = {} to get first page for each subreddit/time
 *   - On load more: call with after = afterMap from previous call to get next page for each
 *   - Accumulate images in state, update afterMap, and stop when all afterMap values are null
 *
 * @param {Object} params
 * @param {string[]} params.subreddits - Array of subreddit names
 * @param {string[]} params.timeRanges - Array of time ranges (e.g. ["day", "week"])
 * @param {string} params.postType - "top", "hot", or "new"
 * @param {number} params.limit - Number of posts per request
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
  const allImages = [];
  const afterTokens = {};

  // Helper to build a unique key for after tokens
  const afterKey = (sub, time) => `${sub}_${time}`;

  for (const subreddit of subreddits) {
    for (const time of timeRanges) {
      let url = `https://www.reddit.com/r/${subreddit}/${postType}.json?limit=${limit}&raw_json=1`;
      if (postType === "top") url += `&t=${time}`;
      const key = afterKey(subreddit, time);
      const afterToken = after?.[key];
      if (afterToken) url += `&after=${afterToken}`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);
        const json = await res.json();
        if (!json.data || !Array.isArray(json.data.children)) {
          afterTokens[key] = null;
          continue;
        }
        const images = json.data.children
          .map(c => c.data)
          .filter(
            p =>
              p.post_hint === "image" &&
              p.preview &&
              p.preview.images?.[0]?.source?.url &&
              /\.(jpe?g|png)$/i.test(p.url) &&
              !p.url.includes("gif") &&
              !p.url.includes("gifv") &&
              p.preview.images[0].source.width > 150 &&
              p.preview.images[0].source.height > 150
          )
          .map(p => ({
            id: p.id,
            title: p.title,
            url: p.url.replace(/&amp;/g, "&"),
            width: p.preview.images[0].source.width,
            height: p.preview.images[0].source.height,
            preview:
              p.preview.images[0].resolutions?.[0]?.url?.replace(/&amp;/g, "&") ||
              null,
            subreddit,
            time,
            postType,
            created_utc: p.created_utc,
            score: p.score,
            author: p.author,
            permalink: p.permalink,
          }));
        allImages.push(...images);
        // If Reddit returns null for after, we've reached the end for this subreddit/time
        afterTokens[key] = json.data.after || null;
      } catch (e) {
        // On error, set after to null so we don't keep retrying
        afterTokens[key] = null;
        // Optionally log error for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.error(`Error fetching r/${subreddit} (${time}):`, e);
        }
      }
    }
  }

  // Deduplicate by post ID (across all subreddits/times)
  const seen = new Set();
  const dedupedImages = [];
  for (const img of allImages) {
    if (!seen.has(img.id)) {
      seen.add(img.id);
      dedupedImages.push(img);
    }
  }

  return { images: dedupedImages, after: afterTokens };
}
export { fetchExtendedWallpapers };
export default fetchExtendedWallpapers;
import { loadSettings } from "../components/settings-storage";

export async function fetchTopImages(subreddits, { limit = 50, time = 'week', after = null } = {}) {
  // Accept a single subreddit as string or an array of subreddits
  const srList = Array.isArray(subreddits) ? subreddits : [subreddits];
  try {
    const results = await Promise.all(
      srList.map(async (subreddit, idx) => {
        let url = `https://www.reddit.com/r/${subreddit}/top.json?limit=${limit}&t=${time}&raw_json=1`;
        // Support after as an array (per subreddit) or single value
        let afterToken = Array.isArray(after) ? after[idx] : after;
        if (afterToken) url += `&after=${afterToken}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!json.data || !Array.isArray(json.data.children)) return { images: [], after: null };
        const images = json.data.children
          .map(c => c.data)
          .filter(p =>
            p.post_hint === 'image' &&
            p.preview &&
            p.preview.images?.[0]?.source?.url &&
            /\.(jpe?g|png)$/i.test(p.url) &&
            !p.url.includes("gif") &&
            !p.over_18 &&
            p.preview.images[0].source.width > 150 &&
            p.preview.images[0].source.height > 150
          )
          .map(p => ({
            id: p.id,
            title: p.title,
            url: p.url.replace(/&amp;/g, "&"),
            width: p.preview.images[0].source.width,
            height: p.preview.images[0].source.height,
            preview: p.preview.images[0].resolutions?.[0]?.url?.replace(/&amp;/g, "&") || null,
            subreddit,
          }));
        return { images, after: json.data.after };
      })
    );
    // Merge all images and after tokens
    const allImages = results.flatMap(r => r.images);
    const afters = results.map(r => r.after);
    return { images: allImages, after: afters };
  } catch (e) {
    console.error("Error fetching Reddit images:", e);
    return { images: [], after: Array.isArray(subreddits) ? subreddits.map(() => null) : null };
  }
}


// Fetch wallpapers from saved subreddits in persistent storage
export async function fetchSavedSubredditsWallpapers(options = {}) {
  const settings = await loadSettings();
  const subreddits = Array.isArray(settings.subreddits) && settings.subreddits.length > 0
    ? settings.subreddits
    : ["wallpapers"];
  return fetchTopImages(subreddits, options);
}

