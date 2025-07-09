export interface RedditImage {
  id: string;
  title: string;
  url: string;
  width: number;
  height: number;
  preview: string | null;
  subreddit?: string;
}

export interface FetchTopImagesResult {
  images: RedditImage[];
  after: string | null;
}

export function fetchTopImages(
  subreddit: string,
  opts?: {
    limit?: number;
    time?: string;
    after?: string | null;
  }
): Promise<FetchTopImagesResult>;
