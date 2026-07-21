import { avatarUrl } from '@/lib/utils';

export function isUsableImageUrl(url: string | null | undefined): url is string {
  return Boolean(url && !/placeholder/i.test(url));
}

export function resolvePlayerPhoto(
  imagePath: string | null | undefined,
  name: string,
  seed?: string,
): string {
  const fallbackUrl = avatarUrl(name, seed ?? name);
  return isUsableImageUrl(imagePath) ? imagePath : fallbackUrl;
}
