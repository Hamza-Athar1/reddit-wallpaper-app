// Test the fetchExtendedWallpapers function directly
const fetchExtendedWallpapers = require('./scripts/redditfetch.js').default;

async function testFetchExtendedWallpapers() {
  try {
    console.log("Testing fetchExtendedWallpapers function...");
    
    const result = await fetchExtendedWallpapers({
      subreddits: ["wallpapers"],
      timeRanges: ["week"],
      postType: "top",
      limit: 10,
      after: {}
    });
    
    console.log("Result:", {
      imageCount: result.images?.length || 0,
      afterKeys: Object.keys(result.after || {}),
      sampleImage: result.images?.[0] ? {
        id: result.images[0].id,
        title: result.images[0].title,
        url: result.images[0].url,
        width: result.images[0].width,
        height: result.images[0].height,
      } : null
    });
    
    console.log("✅ fetchExtendedWallpapers test successful!");
    return true;
  } catch (error) {
    console.error("❌ fetchExtendedWallpapers test failed:", error);
    return false;
  }
}

testFetchExtendedWallpapers();
