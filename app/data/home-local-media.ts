
/** SMD_HOME_MEDIA_SLOT_R1 · VS Code editable LOCAL image addresses only.
 * The slot IDs and Figma geometry remain owned by home-r2-manifest.ts.
 * Published/CMS assets are resolved elsewhere, never overridden here.
 * Copy each image into public/media/home/, then edit src to its root URL.
 */
import type { HomeMediaSlotId } from './home-r2-manifest';
import { homeFilmAssets, type FilmImageId } from './home-film.ts';

export type HomeLocalMediaDraft = Readonly<{
  src: string | null;
  alt: string;
  title: string;
  width: number | null;
  height: number | null;
}>;

/** R1: Homepage content image slots */
export const homeLocalMediaSlots: Readonly<
  Record<HomeMediaSlotId, HomeLocalMediaDraft>
> = {
  'home.special-start.photo': {
    src: '/media/home/statement.png',
    alt: 'SMD 아카데미 교육장 입구',
    title: 'SMD 아카데미 교육장',
    width: 1448,
    height: 1086,
  },

  'home.benefits.01.image': {
    src: '/media/home/r7-benefit-01.jpg',
    alt: 'R6 카탈로그 디자인 시안 사진 01',
    title: 'R6 카탈로그 디자인 시안 01',
    width: 490,
    height: 712,
  },

  'home.benefits.02.image': {
    src: '/media/home/r7-benefit-02.jpg',
    alt: 'R6 카탈로그 디자인 시안 사진 02',
    title: 'R6 카탈로그 디자인 시안 02',
    width: 410,
    height: 708,
  },

  'home.benefits.03.image': {
    src: '/media/home/r7-benefit-03.jpg',
    alt: 'R6 카탈로그 디자인 시안 사진 03',
    title: 'R6 카탈로그 디자인 시안 03',
    width: 670,
    height: 708,
  },

  'home.benefits.04.image': {
    src: '/media/home/r7-benefit-04.jpg',
    alt: 'R6 카탈로그 디자인 시안 사진 04',
    title: 'R6 카탈로그 디자인 시안 04',
    width: 1120,
    height: 859,
  },

  'home.methods.01.image': {
    src: '/media/home/1.png',
    alt: '교육 방법 이미지 1',
    title: '교육 방법 1',
    width: 1756,
    height: 896,
  },

  'home.methods.02.image': {
    src: '/media/home/2.jpg',
    alt: '교육 방법 이미지 2',
    title: '교육 방법 2',
    width: 4000,
    height: 3000,
  },

  'home.methods.03.image': {
    src: '/media/home/3.png',
    alt: '교육 방법 이미지 3',
    title: '교육 방법 3',
    width: 1774,
    height: 887,
  },
};

/**
 * SMD_HOME_MEDIA_SLOT_R2
 *
 * Three independently editable Hero photos.
 *
 * Image directory: public/media/home/
 *
 * Standalone Local:
 *   Uses the image paths configured below.
 *
 * Standalone Published:
 *   Uses the published media.
 *
 * CMS:
 *   Retains its existing media resolution behavior.
 *
 * Figma geometry and Hero dissolve animation remain unchanged.
 */
export const homeHeroLocalMediaSlots: Readonly<
  Record<FilmImageId, HomeLocalMediaDraft>
> = {
  // HERO IMAGE 01
  'hero-1': {
    src: '/media/home/r7-workshop.png',
    alt: homeFilmAssets[0].alt,
    title: homeFilmAssets[0].alt,
    width: 1938,
    height: 811,
  },

  // HERO IMAGE 02
  'hero-2': {
    src: '/media/home/hero-02.jpg',
    alt: homeFilmAssets[1].alt,
    title: homeFilmAssets[1].alt,
    width: homeFilmAssets[1].width,
    height: homeFilmAssets[1].height,
  },

  // HERO IMAGE 03
  'hero-3': {
    src: '/media/home/hero-03.jpg',
    alt: homeFilmAssets[2].alt,
    title: homeFilmAssets[2].alt,
    width: homeFilmAssets[2].width,
    height: homeFilmAssets[2].height,
  },
};
