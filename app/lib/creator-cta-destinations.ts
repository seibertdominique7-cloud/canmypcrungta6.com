import {
  CREATOR_SETUP_BUILDER_PATH,
  CREATOR_SETUP_GUIDE_PATH,
} from '../data/creator-recommendations';

export const VERIFIED_CREATOR_DESTINATIONS = [
  CREATOR_SETUP_BUILDER_PATH,
  CREATOR_SETUP_GUIDE_PATH,
] as const;

export function getCreatorDestinationWarning(value: string) {
  const destination = value.trim();
  if (!destination) return 'Add a destination before enabling this link.';
  if (destination.startsWith('#') || /^https:\/\//i.test(destination)) return '';

  const path = destination.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  if (VERIFIED_CREATOR_DESTINATIONS.includes(
    path as (typeof VERIFIED_CREATOR_DESTINATIONS)[number],
  )) {
    return '';
  }
  if (path === '/articles') {
    return 'This is the general article index, not a creator setup destination.';
  }
  if (path.startsWith('/articles/')) {
    return 'This article will be checked for publish status and creator relevance when saved.';
  }
  if (path.startsWith('/pages/')) {
    return 'This CMS page will be checked for publish and enabled status when saved.';
  }

  return 'This is not a verified built-in creator route. Confirm that the page exists and is enabled.';
}
