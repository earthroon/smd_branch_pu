/** Pinned PSD source witness. Shared UI tokens own mapped display paint. */
export const curriculumR1Source = {
  "schema": "SMD_CURRICULUM_BUILD_SOURCE_V1",
  "sourceAuthority": "PSD_BUILD_SOURCE_V1",
  "pageId": "curriculum",
  "psdFileName": "261028_smd_교육과정페이지.psd",
  "psdSha256": "42da24276ea7c449f886164c439854f84bfadff679f896fc55abad4cc531c012",
  "sourceWidth": 1920,
  "sourceHeight": 6958,
  "sourceBodyOriginY": 132,
  "sourceBodyEndY": 6231,
  "sourceLayerCount": 145,
  "sourceTextCount": 103,
  "bodyTextCount": 95,
  "photoCount": 5,
  "sections": [
    {
      "id": "hero",
      "top": 132,
      "height": 813,
      "mappingStatus": "APPROVED_MAPPING",
      "sourceGrouping": "CANDIDATE_VIRTUAL_TREE",
      "textLayerIds": [
        11,
        14,
        346,
        333,
        13,
        335
      ]
    },
    {
      "id": "facts",
      "top": 945,
      "height": 235,
      "mappingStatus": "APPROVED_MAPPING",
      "sourceGrouping": "CANDIDATE_VIRTUAL_TREE",
      "textLayerIds": [
        19,
        20,
        336,
        337,
        338,
        339,
        340,
        341,
        342,
        343,
        344,
        345
      ]
    },
    {
      "id": "introduction",
      "top": 1180,
      "height": 534,
      "mappingStatus": "APPROVED_MAPPING",
      "sourceGrouping": "CANDIDATE_VIRTUAL_TREE",
      "textLayerIds": [
        33,
        34,
        347,
        348,
        35
      ]
    },
    {
      "id": "daily-flow",
      "top": 1714,
      "height": 671,
      "mappingStatus": "APPROVED_MAPPING",
      "sourceGrouping": "CANDIDATE_VIRTUAL_TREE",
      "textLayerIds": [
        355,
        349,
        354,
        352,
        356,
        357,
        358,
        350
      ]
    },
    {
      "id": "practical-training",
      "top": 2385,
      "height": 1312,
      "mappingStatus": "APPROVED_MAPPING",
      "sourceGrouping": "CANDIDATE_VIRTUAL_TREE",
      "textLayerIds": [
        365,
        46,
        47,
        363,
        364,
        374,
        375,
        376,
        378,
        379,
        380,
        382,
        383,
        384
      ]
    },
    {
      "id": "six-week-program",
      "top": 3697,
      "height": 1270,
      "mappingStatus": "APPROVED_MAPPING",
      "sourceGrouping": "CANDIDATE_VIRTUAL_TREE",
      "textLayerIds": [
        386,
        387,
        153,
        154,
        389,
        390,
        391,
        392,
        393,
        394,
        395,
        396,
        397,
        398,
        400,
        403,
        401,
        402,
        414,
        404,
        405,
        406,
        407,
        408,
        409,
        410,
        411,
        412
      ]
    },
    {
      "id": "course-information",
      "top": 4967,
      "height": 752,
      "mappingStatus": "APPROVED_MAPPING",
      "sourceGrouping": "CANDIDATE_VIRTUAL_TREE",
      "textLayerIds": [
        457,
        415,
        418,
        426,
        427,
        423,
        419,
        428,
        429,
        452,
        453,
        454,
        455,
        443,
        444,
        446,
        447,
        449,
        450
      ]
    },
    {
      "id": "consultation-cta",
      "top": 5719,
      "height": 512,
      "mappingStatus": "APPROVED_MAPPING",
      "sourceGrouping": "CANDIDATE_VIRTUAL_TREE",
      "textLayerIds": [
        137,
        132,
        134
      ]
    }
  ],
  "webFontMetrics": {
    "fontRelease": "pretendard@1.3.9",
    "unitsPerEm": 2048,
    "ascent": 1950,
    "descent": 494,
    "lineGap": 0
  },
  "displayOverrides": {
    "19": {
      "rawText": "20년 경력",
      "text": "6주 과정",
      "reason": "Approved duration label/value correction; original PSD retained"
    }
  },
  "semanticChanges": [
    "Education-period display: 20년 경력 → 6주 과정",
    "AM/PM display #D95E23 → shared --smd-action-orange (#D95E22)",
    "Existing CMS slot afterTeach follows practical training; afterLearningPath follows six-week program"
  ],
  "unresolved": [
    "Week 02–06 detailed content is not provided",
    "Week 01 right-hand media panel intentionally unassigned",
    "Legacy seed/fixture 48 hours, 09–18, 5 seats differs from PSD 42 hours, 09–17, 6 seats"
  ],
  "boundaryMapping": {
    "header": "existing SiteHeader geometry; PSD Header excluded",
    "footer": "existing SiteFooter; PSD FOOTER placeholder excluded",
    "ctaFooterOverlap": "PSD CTA ends 6237; later Footer starts 6231; body ends at visible boundary 6231"
  },
  "sourceManifestDigest": "0efd63e4a115defe295caac0a3ca1bc9080699819cef063e43ad7e5fa97b660d"
} as const;
