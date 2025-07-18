// Simple test script to verify Reddit API is working
async function testRedditAPI() {
  try {
    console.log("Testing Reddit API...");
    
    // Test basic subreddit access
    const url = "https://www.reddit.com/r/wallpapers/top.json?limit=5&t=week&raw_json=1";
    console.log("Fetching from:", url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Reddit-Wallpaper-App/1.0',
      },
    });
    
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Response data structure:", {
      hasData: !!data.data,
      hasChildren: !!data.data?.children,
      childrenCount: data.data?.children?.length || 0,
    });
    
    if (data.data?.children?.length > 0) {
      const firstPost = data.data.children[0].data;
      console.log("First post info:", {
        title: firstPost.title,
        url: firstPost.url,
        post_hint: firstPost.post_hint,
        hasPreview: !!firstPost.preview,
        over_18: firstPost.over_18,
        score: firstPost.score,
      });
    }
    
    console.log("✅ Reddit API test successful!");
    return true;
  } catch (error) {
    console.error("❌ Reddit API test failed:", error);
    return false;
  }
}

// Run the test
testRedditAPI();
