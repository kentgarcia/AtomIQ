/**
 * Opening what a chip, a comment or a `next` block points at. The routes are plain strings from
 * `feed-ui-core.ts` (tested without a router); this is the one place they meet expo-router. A tab
 * is navigated to (it keeps the tab's state), anything else is pushed.
 */

import type { Href, useRouter } from "expo-router";

import type { FeedTarget } from "@/components/feed/feed-ui-core";

type Router = ReturnType<typeof useRouter>;

export function openFeedTarget(router: Router, target: FeedTarget): void {
  if (target.how === "tab") router.navigate(target.href as Href);
  else router.push(target.href as Href);
}

export function pushHref(router: Router, href: string): void {
  router.push(href as Href);
}
