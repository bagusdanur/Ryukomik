declare interface RequestInit {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

declare interface Window {
  __rkOnlineCount?: number;
}
