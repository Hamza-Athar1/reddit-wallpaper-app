declare module "../../scripts/redditfetch.js" {
  export function fetchExtendedWallpapers(params: {
    subreddits?: string[];
    timeRanges?: string[];
    postType?: string;
    limit?: number;
    after?: Record<string, string | null>;
  }): Promise<{ images: any[]; after: Record<string, string | null> }>;
}
