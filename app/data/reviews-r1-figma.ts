/** CF1 read-only Figma semantic registry. Values transcribed from frozen Schema 9 skin.jsonl.
 * NOT a CMS data source; coordinates are design evidence, not CSS layout commands. */
import type { ReviewFilterId } from '../utils/reviews-contract.ts';

export const reviewsFigmaSemanticSlots = {
  "root": [
    "node-4:200"
  ],
  "mainCell": [
    "node-4:203"
  ],
  "hero": [
    "node-4:351",
    "node-4:353",
    "node-4:352"
  ],
  "facts": [
    "node-4:338",
    "node-4:330",
    "node-4:331",
    "node-4:332",
    "node-4:333",
    "node-4:334",
    "node-4:335",
    "node-4:336",
    "node-4:337"
  ],
  "sectionTitle": [
    "node-4:350"
  ],
  "filters": [
    "node-4:326",
    "node-4:327",
    "node-4:324",
    "node-4:325",
    "node-4:322",
    "node-4:323",
    "node-4:320",
    "node-4:321"
  ],
  "cards": [
    "node-4:312",
    "node-4:274",
    "node-4:236"
  ],
  "loadMore": [
    "node-4:341",
    "node-4:342"
  ],
  "cta": [
    "node-4:375",
    "node-4:346",
    "node-4:347",
    "node-4:348",
    "node-4:339",
    "node-4:340"
  ],
  "footerPlaceholder": [
    "node-4:343"
  ]
} as const;

export const reviewsFigmaFilterBindings = {
  "all": {
    "label": "전체 후기",
    "textNode": "node-4:326",
    "backgroundNode": "node-4:327"
  },
  "interior-film": {
    "label": "인테리어필름",
    "textNode": "node-4:324",
    "backgroundNode": "node-4:325"
  },
  "glass-film": {
    "label": "유리필름",
    "textNode": "node-4:322",
    "backgroundNode": "node-4:323"
  },
  "career-prep": {
    "label": "취업·창업 준비",
    "textNode": "node-4:320",
    "backgroundNode": "node-4:321"
  }
} as const satisfies Readonly<Record<ReviewFilterId, Readonly<{label:string;textNode:string;backgroundNode:string}>>>;

export const reviewsFigmaNodes = {
  "node-4:200": {
    "nodeKey": "node-4:200",
    "figmaNodeId": "4:200",
    "nodeKind": "FRAME",
    "parent": null,
    "order": 0,
    "rectLocal": [
      0,
      0,
      1920,
      3033
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      0,
      0
    ]
  },
  "node-4:203": {
    "nodeKey": "node-4:203",
    "figmaNodeId": "4:203",
    "nodeKind": "FRAME",
    "parent": "node-4:201",
    "order": 1,
    "rectLocal": [
      0,
      134.28125,
      1920,
      2171.71875
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "none",
    "worldTopLeft": [
      0,
      134.28125
    ]
  },
  "node-4:351": {
    "nodeKey": "node-4:351",
    "figmaNodeId": "4:351",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 60,
    "rectLocal": [
      434,
      224.71875,
      274,
      26
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "SMD ACADEMY · REVIEWS",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 21.712169647216797,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "58825f60162423458dd0ec3551a82bd6f4513a8e2d6c50531da34e825b2d39b9"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      434,
      359.0
    ]
  },
  "node-4:353": {
    "nodeKey": "node-4:353",
    "figmaNodeId": "4:353",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 62,
    "rectLocal": [
      436,
      277.71875,
      593,
      168
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "unobserved",
    "text": {
      "characters": "배움의 기록이,\n다음 시작의 용기가 되도록.",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 61.50905990600586,
      "lineHeight": {
        "unit": "PIXELS",
        "value": 83.61741638183594
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -3.6905436515808105
      },
      "textDigest": "c4360e2a2d65416f5d355e10123017661411c416ad8d420c2573e58a930f12ff"
    },
    "paintQualification": {
      "status": "blocked",
      "reasonCode": "FNS_PAINT_SOURCE_UNOBSERVED"
    },
    "worldTopLeft": [
      436,
      412.0
    ]
  },
  "node-4:352": {
    "nodeKey": "node-4:352",
    "figmaNodeId": "4:352",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 61,
    "rectLocal": [
      434,
      444.71875,
      376,
      108
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "처음 공구를 잡았던 순간부터, 내 손으로 마감을 완성하기까지.\n인테리어필름·유리필름을 배우는 사람들의 이야기를 담습니다.\n\n",
      "fontName": {
        "family": "Pretendard",
        "style": "Medium"
      },
      "fontSize": 16.999996185302734,
      "lineHeight": {
        "unit": "PIXELS",
        "value": 26.99999237060547
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -1.0199997425079346
      },
      "textDigest": "a2f6337a197ddc5fcf08e1f00158ccaea5f21af79967af5e176c3bd33527a933"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      434,
      579.0
    ]
  },
  "node-4:338": {
    "nodeKey": "node-4:338",
    "figmaNodeId": "4:338",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 39,
    "rectLocal": [
      437.99993896484375,
      519.71875,
      1047,
      109.99992370605469
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "blocked",
      "reasonCode": "FNS_NODE_PAINT_EXECUTION_UNQUALIFIED"
    },
    "worldTopLeft": [
      437.99993896484375,
      654.0
    ]
  },
  "node-4:330": {
    "nodeKey": "node-4:330",
    "figmaNodeId": "4:330",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 43,
    "rectLocal": [
      1375,
      575.71875,
      55,
      30
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "20년",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 25.32076072692871,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "c30a50d103cbd2b9377e442137140837b4e86c8239d477652e8b36384d04a1c5"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      1375,
      710.0
    ]
  },
  "node-4:331": {
    "nodeKey": "node-4:331",
    "figmaNodeId": "4:331",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 44,
    "rectLocal": [
      1375,
      552.71875,
      75,
      16
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "실무 강사 경력",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 13.188998222351074,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "5f5eeac52b2114aecad156d1a5755646dba7989443f85e6e35799e52a2e8b76c"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      1375,
      687.0
    ]
  },
  "node-4:332": {
    "nodeKey": "node-4:332",
    "figmaNodeId": "4:332",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 45,
    "rectLocal": [
      1222,
      575.71875,
      88,
      30
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "최대 6명",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 25.32076072692871,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "81de797c25792d184ce52b5af544377bc8d082af3daa3f67b9293b7b89bc9628"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      1222,
      710.0
    ]
  },
  "node-4:333": {
    "nodeKey": "node-4:333",
    "figmaNodeId": "4:333",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 46,
    "rectLocal": [
      1222,
      552.71875,
      75,
      16
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "소수 정예 수업",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 13.188998222351074,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "afcc6bdc5a5f7e6382a0cda27fdd03ba4e6fcfd1352e569854ef63a19943bd08"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      1222,
      687.0
    ]
  },
  "node-4:334": {
    "nodeKey": "node-4:334",
    "figmaNodeId": "4:334",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 47,
    "rectLocal": [
      1066,
      577.71875,
      98,
      46
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "6주 / 42시간\n",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": {
        "kind": "mixed"
      },
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "c0d5f3a4b1bce4c3554181228f77780fa971374684bbaafcfbf35014ae45aaaa"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      1066,
      712.0
    ]
  },
  "node-4:335": {
    "nodeKey": "node-4:335",
    "figmaNodeId": "4:335",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 48,
    "rectLocal": [
      1065,
      552.71875,
      75,
      16
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "주말 실무 과정",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 13.188998222351074,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "6f2602d180142e76cd03803b9d9af4fac2c782bfd4b2dd7d5305b1f828029bfc"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      1065,
      687.0
    ]
  },
  "node-4:336": {
    "nodeKey": "node-4:336",
    "figmaNodeId": "4:336",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 49,
    "rectLocal": [
      477,
      573.71875,
      232,
      18
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "손으로 익히고, 현장으로 이어지는 교육",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 15.417875289916992,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "22bae22dbb4bf633817543f26dcd70d386c719359a232cdd613071c913214f27"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      477,
      708.0
    ]
  },
  "node-4:337": {
    "nodeKey": "node-4:337",
    "figmaNodeId": "4:337",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 50,
    "rectLocal": [
      477,
      553.71875,
      108,
      16
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "LEARN BY DOING",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 13.188998222351074,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "9fe54c1d5e88ed200b2cf0d0a7ec9dcc61468a32b890af7853e0c7f4063dc268"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      477,
      688.0
    ]
  },
  "node-4:350": {
    "nodeKey": "node-4:350",
    "figmaNodeId": "4:350",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 59,
    "rectLocal": [
      434,
      719.71875,
      162,
      38
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "수강생 이야기",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 32.00442123413086,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -1.9202654361724854
      },
      "textDigest": "5670cfc4f47a8cc1628237c91856d44468568abf86ec5fe8f4ea926fa6d32d05"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      434,
      854.0
    ]
  },
  "node-4:326": {
    "nodeKey": "node-4:326",
    "figmaNodeId": "4:326",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 38,
    "rectLocal": [
      466,
      809.71875,
      59,
      20
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "전체 후기",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 16.488800048828125,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -0.4946640133857727
      },
      "textDigest": "b8ff5bf13057742893a939a76ec0dbb060e1346ab039b1b270dc12aa550a6875"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      466,
      944.0
    ]
  },
  "node-4:327": {
    "nodeKey": "node-4:327",
    "figmaNodeId": "4:327",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 37,
    "rectLocal": [
      437.99993896484375,
      798.7188110351562,
      112.51625061035156,
      42.63771438598633
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      437.99993896484375,
      933.0000610351562
    ]
  },
  "node-4:324": {
    "nodeKey": "node-4:324",
    "figmaNodeId": "4:324",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 35,
    "rectLocal": [
      581,
      809.71875,
      84,
      20
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "인테리어필름",
      "fontName": {
        "family": "Pretendard",
        "style": "Medium"
      },
      "fontSize": 16.488800048828125,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -0.4946640133857727
      },
      "textDigest": "7dceed40b41603d9b270173183115129cb2927e97dcf3383cc6310871b0e81cd"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      581,
      944.0
    ]
  },
  "node-4:325": {
    "nodeKey": "node-4:325",
    "figmaNodeId": "4:325",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 36,
    "rectLocal": [
      564.9999389648438,
      798.7188110351562,
      112.51625061035156,
      42.63771438598633
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "blocked",
      "reasonCode": "FNS_NODE_PAINT_EXECUTION_UNQUALIFIED"
    },
    "worldTopLeft": [
      564.9999389648438,
      933.0000610351562
    ]
  },
  "node-4:322": {
    "nodeKey": "node-4:322",
    "figmaNodeId": "4:322",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 33,
    "rectLocal": [
      720,
      809.71875,
      56,
      20
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "유리필름",
      "fontName": {
        "family": "Pretendard",
        "style": "Medium"
      },
      "fontSize": 16.488800048828125,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -0.4946640133857727
      },
      "textDigest": "1ea18cd9fe970163a1769bda099b2b14d52f6088ce447535b9c4bfed3bdf6e1e"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      720,
      944.0
    ]
  },
  "node-4:323": {
    "nodeKey": "node-4:323",
    "figmaNodeId": "4:323",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 34,
    "rectLocal": [
      691,
      798.7188110351562,
      112.51625061035156,
      42.63771438598633
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "blocked",
      "reasonCode": "FNS_NODE_PAINT_EXECUTION_UNQUALIFIED"
    },
    "worldTopLeft": [
      691,
      933.0000610351562
    ]
  },
  "node-4:320": {
    "nodeKey": "node-4:320",
    "figmaNodeId": "4:320",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 31,
    "rectLocal": [
      830,
      809.71875,
      91,
      20
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "취업·창업 준비",
      "fontName": {
        "family": "Pretendard",
        "style": "Medium"
      },
      "fontSize": 16.488800048828125,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -0.4946640133857727
      },
      "textDigest": "51f880959675c7a1ec67351f88d69e15f5d5f7b0c65cc22a47e7d4d60d13c352"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      830,
      944.0
    ]
  },
  "node-4:321": {
    "nodeKey": "node-4:321",
    "figmaNodeId": "4:321",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 32,
    "rectLocal": [
      818,
      798.7188110351562,
      112.51625061035156,
      42.63771438598633
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "blocked",
      "reasonCode": "FNS_NODE_PAINT_EXECUTION_UNQUALIFIED"
    },
    "worldTopLeft": [
      818,
      933.0000610351562
    ]
  },
  "node-4:312": {
    "nodeKey": "node-4:312",
    "figmaNodeId": "4:312",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 23,
    "rectLocal": [
      437.9723815917969,
      942.691162109375,
      337.57623291015625,
      337.5761413574219
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "blocked",
      "reasonCode": "FNS_NODE_PAINT_EXECUTION_UNQUALIFIED"
    },
    "worldTopLeft": [
      437.9723815917969,
      1076.972412109375
    ]
  },
  "node-4:274": {
    "nodeKey": "node-4:274",
    "figmaNodeId": "4:274",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 13,
    "rectLocal": [
      791.9724731445312,
      942.691162109375,
      337.57611083984375,
      337.5761413574219
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "blocked",
      "reasonCode": "FNS_NODE_PAINT_EXECUTION_UNQUALIFIED"
    },
    "worldTopLeft": [
      791.9724731445312,
      1076.972412109375
    ]
  },
  "node-4:236": {
    "nodeKey": "node-4:236",
    "figmaNodeId": "4:236",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 3,
    "rectLocal": [
      1145.972412109375,
      942.691162109375,
      337.57623291015625,
      337.5761413574219
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "blocked",
      "reasonCode": "FNS_NODE_PAINT_EXECUTION_UNQUALIFIED"
    },
    "worldTopLeft": [
      1145.972412109375,
      1076.972412109375
    ]
  },
  "node-4:341": {
    "nodeKey": "node-4:341",
    "figmaNodeId": "4:341",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 54,
    "rectLocal": [
      938,
      1359.71875,
      45,
      29
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "더보기",
      "fontName": {
        "family": "Pretendard",
        "style": "Medium"
      },
      "fontSize": 17.971769332885742,
      "lineHeight": {
        "unit": "PIXELS",
        "value": 28.54339599609375
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -1.0783061981201172
      },
      "textDigest": "8d57e1ee0f8ec66ae35418e71edffc4965c2a472dffd48d82e5451c8f9e7809d"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      938,
      1494.0
    ]
  },
  "node-4:342": {
    "nodeKey": "node-4:342",
    "figmaNodeId": "4:342",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 53,
    "rectLocal": [
      909.99951171875,
      1351.7652587890625,
      100.56083679199219,
      45.25469970703125
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      909.99951171875,
      1486.0465087890625
    ]
  },
  "node-4:375": {
    "nodeKey": "node-4:375",
    "figmaNodeId": "4:375",
    "nodeKind": "VECTOR",
    "parent": "node-4:203",
    "order": 40,
    "rectLocal": [
      158.99996948242188,
      1574.71875,
      1608.0001220703125,
      412.9999084472656
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      158.99996948242188,
      1709.0
    ]
  },
  "node-4:346": {
    "nodeKey": "node-4:346",
    "figmaNodeId": "4:346",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 55,
    "rectLocal": [
      434,
      1655.71875,
      214,
      26
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "YOUR NEXT CHAPTE",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 21.712169647216797,
      "lineHeight": {
        "unit": "AUTO"
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": 0
      },
      "textDigest": "2407dd264f5b3ee50eb1e42e524805ff461cb74cef85b3e28563dd5577ba7a0c"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      434,
      1790.0
    ]
  },
  "node-4:347": {
    "nodeKey": "node-4:347",
    "figmaNodeId": "4:347",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 56,
    "rectLocal": [
      435,
      1709.71875,
      323,
      138
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "이제, 나의 배움을\n시작해 볼 시간.",
      "fontName": {
        "family": "Pretendard",
        "style": "Bold"
      },
      "fontSize": 51.8286018371582,
      "lineHeight": {
        "unit": "PIXELS",
        "value": 68.99998474121094
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -3.1097161769866943
      },
      "textDigest": "9f29b18f3bc4adf3560864a22e30ed51c1164c40b16c1c35519721d53cf16d61"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      435,
      1844.0
    ]
  },
  "node-4:348": {
    "nodeKey": "node-4:348",
    "figmaNodeId": "4:348",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 57,
    "rectLocal": [
      434,
      1858.71875,
      278,
      64
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "처음 배우는 분도 차근차근.\n나에게 맞는 교육 과정부터 살펴보세요.",
      "fontName": {
        "family": "Pretendard",
        "style": "Regular"
      },
      "fontSize": 19.999996185302734,
      "lineHeight": {
        "unit": "PIXELS",
        "value": 31.51900291442871
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -1.1999996900558472
      },
      "textDigest": "4c09ab95b0387dde3ec0cf2c0a91e6252bb929a7a28b0acef9363cfe67ea1a22"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      434,
      1993.0
    ]
  },
  "node-4:339": {
    "nodeKey": "node-4:339",
    "figmaNodeId": "4:339",
    "nodeKind": "TEXT",
    "parent": "node-4:203",
    "order": 52,
    "rectLocal": [
      1425,
      1770.71875,
      165,
      33
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "교육과정 살펴보기   →",
      "fontName": {
        "family": "Pretendard",
        "style": "Medium"
      },
      "fontSize": 20.38664436340332,
      "lineHeight": {
        "unit": "PIXELS",
        "value": 32.378787994384766
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -1.223198652267456
      },
      "textDigest": "443333dd8ff24a8cf6c8bef633534327c7c36437b259dde91dd107b8c196ebd0"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      1425,
      1905.0
    ]
  },
  "node-4:340": {
    "nodeKey": "node-4:340",
    "figmaNodeId": "4:340",
    "nodeKind": "VECTOR",
    "parent": "node-4:376",
    "order": 0,
    "rectLocal": [
      0,
      0,
      208.04501342773438,
      65.50305938720703
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      1400.958984375,
      1889.0069580078125
    ]
  },
  "node-4:343": {
    "nodeKey": "node-4:343",
    "figmaNodeId": "4:343",
    "nodeKind": "TEXT",
    "parent": "node-4:204",
    "order": 1,
    "rectLocal": [
      896,
      323,
      128,
      54
    ],
    "transformLocal": [
      1,
      0,
      0,
      1,
      0,
      0
    ],
    "sourcePaint": "present",
    "text": {
      "characters": "FOOTER",
      "fontName": {
        "family": "Pretendard",
        "style": "Regular"
      },
      "fontSize": 36.81282424926758,
      "lineHeight": {
        "unit": "PIXELS",
        "value": 53.43824768066406
      },
      "letterSpacing": {
        "unit": "PIXELS",
        "value": -2.2087693214416504
      },
      "textDigest": "eda253e78cb93a5a4a875e7ce4dacb4c217bdfe5efb05227401b4dfa44ba3770"
    },
    "paintQualification": {
      "status": "candidate",
      "reasonCode": null
    },
    "worldTopLeft": [
      896,
      2629
    ]
  }
} as const;
