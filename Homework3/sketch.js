// 복사해서 한 파일로 사용할 수 있도록 내부 변수와 p5.js 함수를 구분
(function () {
  // 1. 조절할 값: 시간은 밀리초, 크기는 화면 비율과 최대 크기
  const zoom = 2;
  // 휴대폰 비율은 유지하고 큰 화면에서 주요 요소가 과도하게 커지는 것을 제한
  const sizeCaps = {
    base: 520,
    overviewDiameter: 640,
    indexDiameter: 12,
    importantWidth: 520,
    importantHeight: 720,
  };
  // 영역 순서: 오른쪽 아래, 왼쪽 아래, 왼쪽 위, 오른쪽 위
  // 각 배열 순서: 중심 원, 호1, 호2, 호3
  const ringColors = [
    ["#4755A5", "#4755A5", "#00BFFF", "#B0C4DE"],
    ["#55B948", "#55B948", "#08753B", "#0E3D1E"],
    ["#FEDD08", "#FEDD08", "#DFC723", "#A38F32"],
    ["#EE2155", "#EE2155", "#DD4A9B", "#6D0B25"],
  ];
  const grayLineColor = "#D8D8D8";
  // 사진 실측 두께를 화면 짧은 변에 대한 비율로 적용
  const outlineRatio = 0.003080231078;
  const maxStrokePixels = { outline: 2.2, gray: 0.7, memo: 0.75, drawing: 2.2 };
  const mainPhotoStrokeRatio = 0.0037639951793482576; // 첫 화면 사진 실측 두께 / 사진 너비
  const centerDotDiameterRatio = 0.06 * 1.3;
  const memoLineToOutlineRatio = 1 / 3.3;
  const memoIndexGapRatio = 0.003;
  const grayToOutlineRatio = 0.000832793996 / outlineRatio;
  const dockScale = 0.55 * 1.3 * 1.5;
  const layerCenterScale = 1.1 * 0.9 * 0.85;
  const layerLayoutCenterScale = 1.1;
  const layerStrokeMultipliers = [1, 1.1, 1.15, 1.18];
  const overviewStrokeMultipliers = [1, 1.1, 1.15, 1.16];
  const layerGrayMultiplier = 1.3 * 1.2 * 1.1;
  const grayStrokeMultiplier = 1.1;
  // 기존 세로 화면 좌우 여백 약 15.05%의 2/3
  const layerSideMarginRatio = 0.1003166666666667 * (2 / 3);
  // 이전 호레이어 디자인의 중심 원 위 여백: 82px / 1272px
  const layerVerticalMarginRatio = 0.36;
  const strokeSizeMultiplier = 0.8;
  const indexSizeMultiplier = 0.8 * 0.6;
  const layerOverallStrokeMultiplier = 1.1 * 1.1 * 1.2;
  const layerNonGrayStrokeMultiplier = 1.2;
  const overviewOverallStrokeMultiplier = 1.1 * 1.05;
  // 중요 박스와 메모 연결선에 공통으로 쓰는 화면 기준 대시
  function dashStyle() {
    return {
      weight:
        min(base * mainPhotoStrokeRatio, maxStrokePixels.outline) * 0.9 * 0.9,
      length: base * 0.018 * 0.9,
      gap: base * 0.015 * 0.9,
    };
  }
  // 호1과 호2의 폭을 0.24로 맞추고 호3 간격은 유지
  // 호3 반지름은 유지하고 중심 원과 호1·호2·호3 사이를 같은 폭으로 분할
  const layerOuterScale = 1.868;
  const layerGap = (layerOuterScale - layerCenterScale) / 3;
  const layerScales = [
    layerCenterScale,
    layerCenterScale + layerGap,
    layerCenterScale + layerGap * 2,
    layerOuterScale,
  ];
  // 전체 보기는 사진에서 측정한 반지름 비율
  const overviewScales = [1, 1.71823772, 2.58191467, 3.57586525];
  const layerDurations = [450, 450, 450];
  const indexMoveDuration = 800;
  const lineDrawDuration = 320;
  const memoTextDelay = 120;
  const doubleClickDelay = 500;
  // 전체 원 펼치기: 중심 원 축소와 동심원 세 개의 펼치기를 동시에 시작
  const circleGrowDuration = 450;
  const circleMarginRatio = 0.0677377607;
  const swipeTravelRatio = 0.6;
  const moveDuration = { open: 504, close: 700 };
  const sizeRules = {
    memoFont: [0.041 * 0.95, 18 * 0.95],
    titleFont: [0.041 * 0.95, 18 * 0.95],
    previewFont: [0.032, 14],
    memoLine: [0.052, 24],
    titleLine: [0.039, 18],
    indexDiameter: [0.018, 10],
    indexLabelGap: [0.018, 12],
    indexRowHeight: [0.05, 24],
    padX: [0.015, 6],
    padY: [0.01, 4],
    edge: [0.02],
    titleGap: [0.003],
    titleInset: [0.01],
    minField: [0.06],
    memoWidth: [0.4],
  };

  // 2. 현재 상태와 저장한 내용
  let canvasElement, cx, cy, r, base, ui, view;
  let mode = "main";
  let selectedArea = null;
  let activeNow = [0, 1, 2, 3];
  let drawings = [[], [], [], []];
  let memos = [];
  let currentMemo = null;
  let titleValues = Array.from({ length: 4 }, () => ["", "", ""]);
  let titleInputs = Array.from({ length: 4 }, () => []);
  let titleCurves = Array.from({ length: 4 }, () => []);
  let fingers = new Map();
  let gesture = null;
  let erasing = false;
  let pendingClick = null;
  let clickTimer = null;
  let transition = null;
  let layerViewBlend = 0;
  let indexMotion = null;
  let indexBlend = 0;
  let layerStart = 0;
  let lineRevealStart = null;
  let memoInputsShown = false;
  let titlesShown = false;
  let circleMotion = null;
  let numberImages = [];
  // 숫자 벡터를 코드에 포함해 외부 파일 경로 없이 표시
  const numberVectors = [
    {
      ratio: 0.40465120498596113,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.70508 26.45508" width="100%" height="100%" style="display:block"><path fill="#221f20" d="M10.70508 23.22070L10.70508 26.45508L0.00000 26.45508L0.00000 23.22070L3.63867 23.22070L3.63867 3.16406L0.00000 3.16406L0.00000 0.00000L7.27734 0.00000L7.27734 23.22070Z"/></svg>',
    },
    {
      ratio: 0.6377284699526804,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.17383 26.92969" width="100%" height="100%" style="display:block"><path fill="#221f20" d="M16.96289 7.20703Q16.96289 9.43945 15.82910 11.10938Q14.69531 12.77930 11.81250 14.90625L10.12500 16.17188Q8.03320 17.75391 6.89941 18.73828Q5.76562 19.72266 4.95703 20.91797Q4.14844 22.11328 3.84961 23.58984L13.81641 23.58984L13.97461 17.45508L17.17383 17.45508L16.96289 26.92969L0.00000 26.92969Q0.03516 23.69531 1.11621 21.31348Q2.19727 18.93164 3.69141 17.38477Q5.18555 15.83789 7.27734 14.25586L9.89648 12.26953Q11.70703 10.95117 12.42773 9.85254Q13.14844 8.75391 13.14844 7.34766Q13.14844 5.36133 11.99707 4.24512Q10.84570 3.12891 8.82422 3.12891Q6.22266 3.12891 5.20312 4.65820Q4.18359 6.18750 4.18359 9.40430L4.18359 10.30078L0.68555 10.30078L0.68555 9.28125Q0.68555 5.04492 2.54883 2.67188Q3.67383 1.30078 5.22070 0.65039Q6.76758 0.00000 8.92969 0.00000Q11.60156 0.00000 13.39453 1.01074Q15.18750 2.02148 16.07520 3.65625Q16.96289 5.29102 16.96289 7.20703Z"/></svg>',
    },
    {
      ratio: 0.6653822516893114,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.21094 27.36914" width="100%" height="100%" style="display:block"><path fill="#221f20" d="M17.01562 7.01367Q17.01562 9.21094 15.88184 10.72266Q14.74805 12.23438 13.27148 12.95508Q15.87305 13.71094 17.04199 15.31934Q18.21094 16.92773 18.21094 19.47656Q18.21094 22.11328 16.90137 23.90625Q15.59180 25.69922 13.51758 26.53418Q11.44336 27.36914 9.10547 27.36914Q4.78125 27.36914 2.39062 25.05762Q0.00000 22.74609 0.00000 17.96484L3.48047 17.96484Q3.60352 20.91797 5.13281 22.57031Q6.66211 24.22266 9.31641 24.22266Q11.68945 24.22266 13.07812 22.93066Q14.46680 21.63867 14.46680 19.58203Q14.46680 17.49023 12.84961 16.11035Q11.23242 14.73047 7.87500 14.73047Q7.04883 14.73047 6.69727 14.76562L6.69727 11.47852L7.18945 11.47852Q9.00000 11.47852 10.30957 11.23242Q11.61914 10.98633 12.52441 10.09863Q13.42969 9.21094 13.42969 7.45312Q13.42969 5.73047 12.40137 4.41211Q11.37305 3.09375 9.28125 3.09375Q7.08398 3.09375 6.03809 4.41211Q4.99219 5.73047 4.88672 8.41992L1.17773 8.41992L1.17773 8.13867Q1.17773 4.83398 2.60156 2.97949Q4.02539 1.12500 5.77441 0.56250Q7.52344 0.00000 9.00000 0.00000Q12.99023 0.00000 15.00293 1.97754Q17.01562 3.95508 17.01562 7.01367Z"/></svg>',
    },
    {
      ratio: 0.6874999766081872,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.36914 26.71875" width="100%" height="100%" style="display:block"><path fill="#221f20" d="M18.36914 16.38281L18.36914 19.58203L14.15039 19.58203L14.15039 23.48438L16.57617 23.48438L16.57617 26.71875L7.82227 26.71875L7.82227 23.48438L10.63477 23.48438L10.63477 19.58203L1.74023 19.58203Q1.23047 17.82422 0.00000 16.61133L11.05664 0.00000L14.15039 0.00000L14.15039 16.38281ZM10.63477 16.38281L10.63477 5.94141L3.67383 16.38281Z"/></svg>',
    },
  ];
  // 원본 이미지에서 중심 반지름 대비 실측한 숫자 위치와 높이
  const numberLayout = [
    {
      digit: 1,
      area: 2,
      xRatio: -0.81806248,
      yRatio: -0.15192589,
      heightRatio: 0.17140357,
      rotation: 0,
    },
    {
      digit: 2,
      area: 3,
      xRatio: 0.14413482,
      yRatio: -0.81806248,
      heightRatio: 0.1636125,
      rotation: 90,
    },
    {
      digit: 3,
      area: 0,
      xRatio: 0.84143569,
      yRatio: 0.12855267,
      heightRatio: 0.17140357,
      rotation: 180,
    },
    {
      digit: 4,
      area: 1,
      xRatio: -0.14413482,
      yRatio: 0.84143569,
      heightRatio: 0.1636125,
      rotation: 270,
    },
  ];

  const dateGlyphs = {
    T: {
      width: 23.80078,
      path: "M19.37109 19.19531L19.37109 12.81445L13.90430 12.81445L13.90430 32.69531L17.34961 32.69531L17.34961 36.00000L6.52148 36.00000L6.52148 32.69531L9.89648 32.69531L9.89648 12.81445L4.46484 12.81445L4.46484 19.19531L1.19531 19.19531L1.19531 9.50977L22.64062 9.50977L22.64062 19.19531Z",
    },
    o: {
      width: 22.14844,
      path: "M20.77734 26.78906Q20.77734 29.47852 19.49414 31.71094Q18.21094 33.94336 15.99609 35.24414Q13.78125 36.54492 11.09180 36.54492Q8.31445 36.54492 6.08203 35.24414Q3.84961 33.94336 2.61035 31.71094Q1.37109 29.47852 1.37109 26.78906Q1.37109 23.97656 2.61035 21.76172Q3.84961 19.54688 6.06445 18.29004Q8.27930 17.03320 11.09180 17.03320Q13.81641 17.03320 16.03125 18.36035Q18.24609 19.68750 19.51172 21.91992Q20.77734 24.15234 20.77734 26.78906ZM11.09180 33.01172Q12.70898 33.01172 14.06250 32.16797Q15.41602 31.32422 16.17188 29.90039Q16.92773 28.47656 16.92773 26.78906Q16.92773 25.13672 16.17188 23.71289Q15.41602 22.28906 14.06250 21.41895Q12.70898 20.54883 11.05664 20.54883Q9.43945 20.54883 8.08594 21.40137Q6.73242 22.25391 5.95898 23.69531Q5.18555 25.13672 5.18555 26.78906Q5.18555 28.44141 5.95898 29.88281Q6.73242 31.32422 8.10352 32.16797Q9.47461 33.01172 11.09180 33.01172Z",
    },
    d: {
      width: 24.41602,
      path: "M23.97656 32.76562L23.97656 36.00000L17.03320 36.00000L17.03320 33.29297Q14.25586 36.31641 10.40625 36.31641Q7.73438 36.31641 5.68652 35.05957Q3.63867 33.80273 2.50488 31.64062Q1.37109 29.47852 1.37109 26.85938Q1.37109 24.18750 2.57520 21.93750Q3.77930 19.68750 5.90625 18.36035Q8.03320 17.03320 10.51172 17.03320Q12.30469 17.03320 13.91309 17.75391Q15.52148 18.47461 17.03320 20.02148L17.03320 12.70898L13.46484 12.70898L13.46484 9.50977L20.63672 9.50977L20.63672 32.76562ZM11.09180 33.08203Q12.77930 33.08203 14.13281 32.18555Q15.48633 31.28906 16.25977 29.79492Q17.03320 28.30078 17.03320 26.59570Q17.03320 24.87305 16.25977 23.44922Q15.48633 22.02539 14.11523 21.19922Q12.74414 20.37305 11.02148 20.37305Q9.35156 20.37305 8.04199 21.26074Q6.73242 22.14844 5.97656 23.61621Q5.22070 25.08398 5.22070 26.75391Q5.22070 28.54688 5.99414 29.98828Q6.76758 31.42969 8.10352 32.25586Q9.43945 33.08203 11.09180 33.08203Z",
    },
    a: {
      width: 20.88281,
      path: "M17.10352 24.04688L17.10352 32.76562L20.19727 32.76562L20.19727 36.00000L13.90430 36.00000L13.90430 33.73242Q11.26758 36.31641 8.03320 36.31641Q6.32812 36.31641 4.91309 35.52539Q3.49805 34.73438 2.64551 33.40723Q1.79297 32.08008 1.79297 30.46289Q1.79297 28.72266 2.73340 27.36035Q3.67383 25.99805 5.27344 25.25977Q6.87305 24.52148 8.49023 24.52148Q11.19727 24.52148 13.53516 26.10352L13.53516 24.11719Q13.53516 21.95508 12.62109 21.02344Q11.70703 20.09180 9.61523 20.09180Q8.13867 20.09180 7.14551 20.62793Q6.15234 21.16406 5.50195 22.25391L2.02148 21.39258Q3.19922 19.19531 5.20312 18.11426Q7.20703 17.03320 9.96680 17.03320Q13.67578 17.03320 15.38965 18.72070Q17.10352 20.40820 17.10352 24.04688ZM8.52539 33.52148Q11.19727 33.52148 13.53516 31.28906L13.53516 29.12695Q11.16211 27.28125 8.78906 27.28125Q7.34766 27.28125 6.30176 28.18652Q5.25586 29.09180 5.25586 30.46289Q5.25586 31.78125 6.16992 32.65137Q7.08398 33.52148 8.52539 33.52148Z",
    },
    y: {
      width: 22.46484,
      path: "M7.62891 20.77734L11.63672 31.21875L15.52148 20.77734L13.06055 20.77734L13.06055 17.52539L21.88477 17.52539L21.88477 20.77734L19.16016 20.77734L10.03711 44.27930L3.88477 44.27930L3.88477 41.11523L7.52344 41.11523L9.72070 35.68359L3.67383 20.77734L0.58008 20.77734L0.58008 17.52539L9.82617 17.52539L9.82617 20.77734Z",
    },
    0: {
      width: 21.12891,
      path: "M19.72266 22.78125Q19.72266 27.10547 18.60645 30.18164Q17.49023 33.25781 15.44238 34.84863Q13.39453 36.43945 10.58203 36.43945Q6.11719 36.43945 3.74414 32.74805Q1.37109 29.05664 1.37109 22.78125Q1.37109 18.43945 2.48730 15.35449Q3.60352 12.26953 5.68652 10.66992Q7.76953 9.07031 10.58203 9.07031Q14.97656 9.07031 17.34961 12.74414Q19.72266 16.41797 19.72266 22.78125ZM10.58203 33.32812Q13.18359 33.32812 14.52832 30.86719Q15.87305 28.40625 15.87305 22.64062Q15.87305 16.92773 14.48438 14.54590Q13.09570 12.16406 10.54688 12.16406Q7.80469 12.16406 6.53027 14.82715Q5.25586 17.49023 5.25586 22.78125Q5.25586 28.33594 6.59180 30.83203Q7.92773 33.32812 10.58203 33.32812Z",
    },
    1: {
      width: 21.12891,
      path: "M16.31250 32.76562L16.31250 36.00000L5.60742 36.00000L5.60742 32.76562L9.24609 32.76562L9.24609 12.70898L5.60742 12.70898L5.60742 9.54492L12.88477 9.54492L12.88477 32.76562Z",
    },
    2: {
      width: 21.12891,
      path: "M18.50977 16.27734Q18.50977 18.50977 17.37598 20.17969Q16.24219 21.84961 13.35938 23.97656L11.67188 25.24219Q9.58008 26.82422 8.44629 27.80859Q7.31250 28.79297 6.50391 29.98828Q5.69531 31.18359 5.39648 32.66016L15.36328 32.66016L15.52148 26.52539L18.72070 26.52539L18.50977 36.00000L1.54688 36.00000Q1.58203 32.76562 2.66309 30.38379Q3.74414 28.00195 5.23828 26.45508Q6.73242 24.90820 8.82422 23.32617L11.44336 21.33984Q13.25391 20.02148 13.97461 18.92285Q14.69531 17.82422 14.69531 16.41797Q14.69531 14.43164 13.54395 13.31543Q12.39258 12.19922 10.37109 12.19922Q7.76953 12.19922 6.75000 13.72852Q5.73047 15.25781 5.73047 18.47461L5.73047 19.37109L2.23242 19.37109L2.23242 18.35156Q2.23242 14.11523 4.09570 11.74219Q5.22070 10.37109 6.76758 9.72070Q8.31445 9.07031 10.47656 9.07031Q13.14844 9.07031 14.94141 10.08105Q16.73438 11.09180 17.62207 12.72656Q18.50977 14.36133 18.50977 16.27734Z",
    },
    3: {
      width: 21.12891,
      path: "M18.31641 16.08398Q18.31641 18.28125 17.18262 19.79297Q16.04883 21.30469 14.57227 22.02539Q17.17383 22.78125 18.34277 24.38965Q19.51172 25.99805 19.51172 28.54688Q19.51172 31.18359 18.20215 32.97656Q16.89258 34.76953 14.81836 35.60449Q12.74414 36.43945 10.40625 36.43945Q6.08203 36.43945 3.69141 34.12793Q1.30078 31.81641 1.30078 27.03516L4.78125 27.03516Q4.90430 29.98828 6.43359 31.64062Q7.96289 33.29297 10.61719 33.29297Q12.99023 33.29297 14.37891 32.00098Q15.76758 30.70898 15.76758 28.65234Q15.76758 26.56055 14.15039 25.18066Q12.53320 23.80078 9.17578 23.80078Q8.34961 23.80078 7.99805 23.83594L7.99805 20.54883L8.49023 20.54883Q10.30078 20.54883 11.61035 20.30273Q12.91992 20.05664 13.82520 19.16895Q14.73047 18.28125 14.73047 16.52344Q14.73047 14.80078 13.70215 13.48242Q12.67383 12.16406 10.58203 12.16406Q8.38477 12.16406 7.33887 13.48242Q6.29297 14.80078 6.18750 17.49023L2.47852 17.49023L2.47852 17.20898Q2.47852 13.90430 3.90234 12.04980Q5.32617 10.19531 7.07520 9.63281Q8.82422 9.07031 10.30078 9.07031Q14.29102 9.07031 16.30371 11.04785Q18.31641 13.02539 18.31641 16.08398Z",
    },
    4: {
      width: 21.12891,
      path: "M19.47656 25.66406L19.47656 28.86328L15.25781 28.86328L15.25781 32.76562L17.68359 32.76562L17.68359 36.00000L8.92969 36.00000L8.92969 32.76562L11.74219 32.76562L11.74219 28.86328L2.84766 28.86328Q2.33789 27.10547 1.10742 25.89258L12.16406 9.28125L15.25781 9.28125L15.25781 25.66406ZM11.74219 25.66406L11.74219 15.22266L4.78125 25.66406Z",
    },
    5: {
      width: 21.12891,
      path: "M14.57227 16.55859L14.57227 12.84961L6.48633 12.84961L5.90625 20.70703Q8.24414 18.75586 11.33789 18.75586Q13.81641 18.75586 15.65332 19.94238Q17.49023 21.12891 18.46582 23.10645Q19.44141 25.08398 19.44141 27.47461Q19.44141 30.12891 18.34277 32.16797Q17.24414 34.20703 15.16992 35.32324Q13.09570 36.43945 10.33594 36.43945Q6.29297 36.43945 3.97266 34.14551Q1.65234 31.85156 1.40625 27.54492L4.81641 27.54492Q5.15039 30.26953 6.59180 31.81641Q8.03320 33.36328 10.37109 33.36328Q12.70898 33.36328 14.18555 31.76367Q15.66211 30.16406 15.66211 27.54492Q15.66211 24.83789 14.27344 23.37891Q12.88477 21.91992 10.72266 21.91992Q7.55859 21.91992 5.43164 25.13672Q4.25391 23.97656 2.67188 23.15039L3.74414 9.54492L17.85938 9.54492L17.85938 16.55859Z",
    },
    6: {
      width: 21.12891,
      path: "M18.75586 17.31445L15.55664 17.31445Q15.29297 15.15234 14.01855 13.67578Q12.74414 12.19922 10.79297 12.19922Q8.31445 12.19922 6.89062 14.80957Q5.46680 17.41992 5.39648 22.06055Q8.17383 19.16016 11.63672 19.16016Q13.57031 19.16016 15.24902 20.10938Q16.92773 21.05859 17.94727 22.89551Q18.96680 24.73242 18.96680 27.28125Q18.96680 29.81250 18.03516 31.89551Q17.10352 33.97852 15.30176 35.20898Q13.50000 36.43945 11.02148 36.43945Q8.34961 36.43945 6.30176 34.99805Q4.25391 33.55664 3.08496 30.56836Q1.91602 27.58008 1.91602 23.11523Q1.91602 16.52344 4.30664 12.79688Q6.69727 9.07031 11.23242 9.07031Q14.69531 9.07031 16.67285 11.37305Q18.65039 13.67578 18.75586 17.31445ZM10.86328 33.25781Q13.06055 33.25781 14.34375 31.65820Q15.62695 30.05859 15.62695 27.65039Q15.62695 25.45312 14.45801 24.02930Q13.28906 22.60547 11.19727 22.60547Q8.34961 22.60547 5.57227 26.10352Q6.45117 33.25781 10.86328 33.25781Z",
    },
    7: {
      width: 21.12891,
      path: "M11.63672 32.69531L11.63672 32.76562L14.73047 32.76562L14.73047 36.00000L4.25391 36.00000L4.25391 32.76562L7.76953 32.76562Q8.17383 27.43945 10.02832 22.30664Q11.88281 17.17383 14.73047 12.84961L5.57227 12.84961L5.57227 16.48828L2.30273 16.48828L2.30273 9.54492L18.86133 9.54492L18.86133 12.23438Q16.92773 14.73047 15.24902 18.45703Q13.57031 22.18359 12.60352 26.01562Q11.63672 29.84766 11.63672 32.69531Z",
    },
    8: {
      width: 21.12891,
      path: "M19.00195 16.01367Q19.00195 19.82812 15.08203 22.14844Q19.82812 24.01172 19.82812 28.68750Q19.82812 31.02539 18.73828 32.77441Q17.64844 34.52344 15.59180 35.48145Q13.53516 36.43945 10.72266 36.43945Q6.59180 36.43945 3.94629 34.52344Q1.30078 32.60742 1.30078 28.68750Q1.30078 24.01172 6.01172 22.14844Q2.12695 19.91602 2.12695 15.97852Q2.12695 13.74609 3.26074 12.18164Q4.39453 10.61719 6.26660 9.84375Q8.13867 9.07031 10.37109 9.07031Q14.29102 9.07031 16.64648 10.94238Q19.00195 12.81445 19.00195 16.01367ZM10.65234 20.67188Q12.53320 20.67188 13.97461 19.66113Q15.41602 18.65039 15.41602 16.45312Q15.41602 14.29102 14.18555 13.26270Q12.95508 12.23438 10.44141 12.23438Q8.20898 12.23438 6.95215 13.33301Q5.69531 14.43164 5.69531 16.38281Q5.69531 18.47461 7.00488 19.57324Q8.31445 20.67188 10.65234 20.67188ZM10.58203 33.32812Q12.88477 33.32812 14.41406 32.03613Q15.94336 30.74414 15.94336 28.54688Q15.94336 26.38477 14.56348 25.07520Q13.18359 23.76562 10.44141 23.76562Q8.06836 23.76562 6.60938 25.07520Q5.15039 26.38477 5.15039 28.54688Q5.15039 30.70898 6.64453 32.01855Q8.13867 33.32812 10.58203 33.32812Z",
    },
    9: {
      width: 21.12891,
      path: "M18.86133 22.46484Q18.86133 29.05664 16.45312 32.74805Q14.04492 36.43945 9.58008 36.43945Q6.15234 36.43945 4.15723 34.20703Q2.16211 31.97461 1.98633 28.16016L5.18555 28.16016Q5.50195 30.53320 6.75000 31.91309Q7.99805 33.29297 9.79102 33.29297Q12.42773 33.29297 13.89551 30.57715Q15.36328 27.86133 15.36328 23.43164Q12.67383 26.34961 9.17578 26.34961Q7.08398 26.34961 5.41406 25.33887Q3.74414 24.32812 2.76855 22.45605Q1.79297 20.58398 1.79297 18.14062Q1.79297 15.69727 2.73340 13.62305Q3.67383 11.54883 5.47559 10.30957Q7.27734 9.07031 9.75586 9.07031Q13.90430 9.07031 16.38281 12.43652Q18.86133 15.80273 18.86133 22.46484ZM9.58008 22.90430Q12.46289 22.90430 15.18750 19.40625Q14.76562 15.80273 13.46484 14.01855Q12.16406 12.23438 9.86133 12.23438Q7.76953 12.23438 6.45996 13.82520Q5.15039 15.41602 5.15039 17.85938Q5.15039 20.02148 6.28418 21.46289Q7.41797 22.90430 9.58008 22.90430Z",
    },
    "/": {
      width: 17.10352,
      path: "M0.17578 36.43945L13.74609 8.96484L16.89258 8.96484L3.33984 36.43945Z",
    },
  };
  let todayLabel;
  function createTodayLabel() {
    todayLabel = document.createElement("div");
    Object.assign(todayLabel.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "1",
    });
    document.body.appendChild(todayLabel);
  }
  function positionTodayLabel() {
    if (!todayLabel) return;
    todayLabel.style.display =
      mode === "main" || mode === "important" ? "block" : "none";
    if (mode !== "main" && mode !== "important") return;
    let now = new Date();
    let date = now.getMonth() + 1 + "/" + now.getDate();
    let paths = "";
    for (let [row, value] of ["Today", date].entries()) {
      let x = 0;
      for (let char of value) {
        let glyph = dateGlyphs[char];
        paths +=
          '<path transform="translate(' +
          x +
          " " +
          row * 48 +
          ')" d="' +
          glyph.path +
          '"/>';
        x += glyph.width;
      }
    }
    todayLabel.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 90" width="100%" height="100%"><g fill="black">' +
      paths +
      "</g></svg>";
    let point = canvasToScreen({ x: width * 0.03, y: cy });
    let font = min(base * 0.033, 22);
    let canvasRect = canvasElement.getBoundingClientRect();
    let unit = ((font / 36) * canvasRect.width) / width;
    Object.assign(todayLabel.style, {
      left: point.x + "px",
      top: point.y - 36 * unit + "px",
      width: 140 * unit + "px",
      height: 90 * unit + "px",
    });
  }

  // 중요 메모: 테두리 대시의 길이·간격은 박스 크기와 무관하게 고정
  let importantBox, importantSvg, importantInput;
  let importantProgress = 0,
    importantTarget = 0,
    importantUpdatedAt = null;
  let importantOverview,
    importantOverviewKey = "";
  function createImportantOverview() {
    importantOverview = document.createElement("div");
    Object.assign(importantOverview.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2",
    });
    document.body.appendChild(importantOverview);
  }
  function overviewStarSvg(size) {
    let points = [];
    for (let i = 0; i < 10; i++) {
      let angle = -Math.PI / 2 + (i * Math.PI) / 5,
        radius = (size / 2) * (i % 2 ? 0.42 : 1);
      points.push(
        size / 2 +
          Math.cos(angle) * radius +
          "," +
          (size / 2 + Math.sin(angle) * radius),
      );
    }
    return `<svg style="vertical-align:baseline" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><polygon points="${points.join(" ")}" fill="black"/></svg>`;
  }
  function positionImportantOverview() {
    if (!importantOverview) return;
    let shown =
      mode === "circles" &&
      circleMotion.progress > 0 &&
      importantInput.value.trim();
    importantOverview.style.display = shown ? "block" : "none";
    if (!shown) return;
    let rect = canvasElement.getBoundingClientRect(),
      unit = rect.width / width;
    let radius = r * circleMotion.targetScale * overviewScales[3];
    let edge = height * 0.02,
      separation = base * 0.025;
    let font =
      Math.max(16, min(base * 0.033, 22) * unit) * 0.85 * 0.8 * 0.9 * 1.07;
    let line = min(base * 0.06, 36) * 0.95 * unit * 0.8 * 0.85 * 1.07 * 1.1;
    let star = base * 0.032 * 0.8 * unit * 0.8,
      gap = base * 0.008 * unit * 0.8;
    let key = [
      importantInput.value,
      width,
      height,
      rect.left,
      rect.top,
      rect.width,
      rect.height,
    ].join("|");
    importantOverview.style.opacity = smoothStep(circleMotion.progress);
    if (key === importantOverviewKey) return;
    importantOverviewKey = key;
    importantOverview.innerHTML = "";
    let slots = [
      { top: edge, bottom: cy - radius - separation },
      { top: cy + radius + separation, bottom: height - edge },
    ];
    let containers = slots.map((slot) => {
      let element = document.createElement("div");
      Object.assign(element.style, {
        position: "absolute",
        left: canvasToScreen({ x: cx - radius, y: 0 }).x + "px",
        top: canvasToScreen({ x: 0, y: slot.top }).y + "px",
        width: radius * 2 * unit + "px",
        height: Math.max(0, slot.bottom - slot.top) * unit + "px",
        overflowY: "auto",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
        alignContent: "start",
        gridAutoFlow: "row",
        alignItems: "baseline",
        columnGap: "0px",
        pointerEvents: "auto",
        fontFamily: "sans-serif",
        fontSize: font + "px",
        lineHeight: line + "px",
        color: "#000",
        touchAction: "pan-y",
      });
      connectOverviewSwipe(element);
      importantOverview.appendChild(element);
      return element;
    });
    let container = containers[0],
      inBottom = false,
      topItems = [];
    for (let paragraph of importantInput.value
      .split(/\r?\n/)
      .filter((value) => value.trim())) {
      let row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex",
        alignItems: "baseline",
        gap: gap + "px",
        minWidth: "0",
        paddingRight: gap + "px",
      });
      let marker = document.createElement("span");
      marker.innerHTML = overviewStarSvg(star);
      Object.assign(marker.style, {
        display: "inline-block",
        flex: "0 0 " + star + "px",
        width: star + "px",
        height: star + "px",
        lineHeight: "0",
      });
      let text = document.createElement("div");
      text.textContent = paragraph;
      Object.assign(text.style, {
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        minWidth: "0",
        flex: "1",
      });
      row.appendChild(marker);
      row.appendChild(text);
      container.appendChild(row);
      if (!inBottom) {
        topItems.push(row);
        if (container.scrollHeight > container.clientHeight + 1) {
          // 행의 왼쪽·오른쪽을 함께 아래쪽 공간으로 넘김
          let lastRow =
            topItems.length % 2 === 0 ? topItems.slice(-2) : topItems.slice(-1);
          for (let item of lastRow) {
            container.removeChild(item);
            containers[1].appendChild(item);
          }
          container = containers[1];
          inBottom = true;
        }
      }
    }
  }

  // 전체보기 메모 위에서도 가로 스와이프를 처리하고 세로 스크롤은 유지
  function connectOverviewSwipe(element) {
    function canvasEvent(event) {
      let rect = canvasElement.getBoundingClientRect();
      return {
        pointerId: event.pointerId,
        offsetX: ((event.clientX - rect.left) * width) / rect.width,
        offsetY: ((event.clientY - rect.top) * height) / rect.height,
      };
    }
    element.addEventListener("pointerdown", function (event) {
      if (mode !== "circles" || gesture) return;
      let point = canvasEvent(event);
      startClick(event.pointerId, { x: point.offsetX, y: point.offsetY });
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener("pointermove", function (event) {
      if (mode === "circles") pointerMove(canvasEvent(event));
    });
    element.addEventListener("pointerup", function (event) {
      pointerUp(canvasEvent(event));
    });
    element.addEventListener("pointercancel", function (event) {
      pointerCancel(canvasEvent(event));
    });
  }

  function createImportantBox() {
    importantBox = document.createElement("div");
    Object.assign(importantBox.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "3",
    });
    importantSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    Object.assign(importantSvg.style, {
      width: "100%",
      height: "100%",
      overflow: "visible",
      pointerEvents: "none",
    });
    importantInput = document.createElement("textarea");
    importantInput.setAttribute("aria-label", "중요 메모");
    Object.assign(importantInput.style, {
      position: "absolute",
      resize: "none",
      border: "none",
      outline: "none",
      boxSizing: "border-box",
      backgroundColor: "transparent",
      color: "#000",
      fontFamily: "sans-serif",
      overflowY: "auto",
      touchAction: "pan-y",
      margin: "0",
      borderRadius: "0",
      padding: "0",
    });
    importantBox.appendChild(importantSvg);
    importantBox.appendChild(importantInput);
    document.body.appendChild(importantBox);
    importantSvg.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (mode === "main" || mode === "important") toggleImportantBox();
    });
    importantInput.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
    });
  }
  function toggleImportantBox() {
    clearTimeout(clickTimer);
    pendingClick = null;
    gesture = null;
    importantTarget = importantTarget ? 0 : 1;
    mode = "important";
    if (!importantTarget) importantInput.blur();
  }
  function updateImportantBox() {
    let now = millis();
    let elapsed =
      importantUpdatedAt == null ? 0 : Math.min(64, now - importantUpdatedAt);
    importantUpdatedAt = now;
    importantProgress +=
      Math.sign(importantTarget - importantProgress) *
      Math.min(Math.abs(importantTarget - importantProgress), elapsed / 600);
    if (mode === "important") {
      view.x = lerp(cx, width * 0.085, smoothStep(importantProgress));
      if (importantProgress === 0 && importantTarget === 0) mode = "main";
    }
  }
  // 테두리 전체에 대시를 한 번만 배치하고 가장 많이 걸친 영역의 색을 선택
  function importantDashPaths(x, y, width, height, dash, gap, weight) {
    let vertices = [
      { x: x + width / 2, y },
      { x: x + width, y },
      { x: x + width, y: y + height / 2 },
      { x: x + width, y: y + height },
      { x: x + width / 2, y: y + height },
      { x, y: y + height },
      { x, y: y + height / 2 },
      { x, y },
      { x: x + width / 2, y },
    ];
    let distances = [0];
    for (let i = 1; i < vertices.length; i++)
      distances.push(
        distances[i - 1] + pointDistance(vertices[i - 1], vertices[i]),
      );
    let total = distances[8],
      quarter = total / 4;
    let colors = ["#EE2155", "#4755A5", "#55B948", "#FEDD08"];
    function at(distance) {
      let i = 1;
      while (i < 8 && distance > distances[i]) i++;
      return mix(
        vertices[i - 1],
        vertices[i],
        (distance - distances[i - 1]) / (distances[i] - distances[i - 1]),
      );
    }
    let paths = "";
    for (let start = 0; start < total; start += dash + gap) {
      let end = start + dash,
        best = 0,
        chosen = 0;
      for (let area = 0; area < 4; area++) {
        let overlap = Math.max(
          0,
          Math.min(end, (area + 1) * quarter) - Math.max(start, area * quarter),
        );
        if (overlap > best) {
          best = overlap;
          chosen = area;
        }
      }
      function segment(from, to, color) {
        let a = at(from),
          b = at(to),
          path = `M ${a.x} ${a.y}`;
        for (let i = 1; i < 8; i++)
          if (distances[i] > from && distances[i] < to)
            path += ` L ${vertices[i].x} ${vertices[i].y}`;
        path += ` L ${b.x} ${b.y}`;
        return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${weight}" stroke-linecap="butt" stroke-linejoin="miter"/>`;
      }
      if (end > total) {
        // 생략했던 마지막 대시를 닫힘 지점 너머까지 유지. 이 지점만 노랑·빨강을 이어 표시
        paths += segment(start, total, colors[3]);
        paths += segment(0, end - total, colors[0]);
      } else paths += segment(start, end, colors[chosen]);
    }
    return paths;
  }
  function positionImportantBox() {
    if (!importantBox) return;
    let visible = mode !== "drawing" && mode !== "circles";
    importantBox.style.display = visible ? "block" : "none";
    if (!visible) return;
    let t = smoothStep(importantProgress);
    let edge = width * 0.055;
    let layerY = isBelow(selectedArea)
      ? edge + base * 0.077
      : height - edge - base * 0.1;
    let restingY = cy - (base * 0.1) / 2 + height * 0.008;
    let layerOffset = isLayerView() ? (layerY - restingY) * layerViewBlend : 0;
    let small = base * 0.1;
    let right = width * 0.945;
    let x = lerp(
      right - small,
      right - min(width * 0.595, sizeCaps.importantWidth),
      t,
    );
    let y = lerp(restingY + layerOffset, height * 0.168, t);
    let boxWidth = right - x,
      boxHeight = lerp(small, min(height * 0.68, sizeCaps.importantHeight), t);
    let point = canvasToScreen({ x, y });
    let rect = canvasElement.getBoundingClientRect();
    let unit = rect.width / width;
    x = point.x;
    y = point.y;
    boxWidth *= unit;
    boxHeight *= unit;
    let style = dashStyle();
    let strokeSize =
      min(base * mainPhotoStrokeRatio, maxStrokePixels.outline) * 0.9 * unit;
    let dash = style.length * unit,
      gap = style.gap * unit;
    let midX = x + boxWidth / 2,
      midY = y + boxHeight / 2;
    let paths = importantDashPaths(
      x,
      y,
      boxWidth,
      boxHeight,
      dash,
      gap,
      strokeSize,
    );
    // 별의 가로 좌표는 작은 박스의 중앙에 고정
    let starX = canvasToScreen({ x: right - small / 2, y: 0 }).x,
      starY = y - base * 0.045 * unit;
    let starRadius = base * 0.032 * unit,
      points = [];
    for (let i = 0; i < 10; i++) {
      let angle = -Math.PI / 2 + (i * Math.PI) / 5,
        radius = starRadius * (i % 2 ? 0.42 : 1);
      points.push(
        starX +
          Math.cos(angle) * radius +
          "," +
          (starY + Math.sin(angle) * radius),
      );
    }
    // 다섯 글자 폭과 인덱스 여백을 합쳐 왼쪽에 필요한 가림 폭을 계산
    let previewWidths = ["WWWWW", "가나다라마", ...memos.map(previewText)].map(
      (value) => measureMemoText(value, ui.previewFont),
    );
    let maskLeft =
      Math.max(
        base * 0.07,
        Math.max(...previewWidths) +
          ui.indexLabelGap +
          visibleIndexDiameter() / 2,
      ) * unit;
    importantSvg.innerHTML =
      `<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="white" fill-opacity="${t}" style="pointer-events:all;cursor:pointer"/>` +
      paths +
      `<rect x="${starX - starRadius - maskLeft}" y="${starY - starRadius - base * 0.018 * unit}" width="${starRadius * 2 + maskLeft + base * 0.018 * unit}" height="${Math.max(0, Math.min(starY + starRadius + base * 0.018 * unit, y - strokeSize) - (starY - starRadius - base * 0.018 * unit))}" fill="white" style="pointer-events:none;display:${isLayerView() ? "none" : "block"}"/><polygon points="${points.join(" ")}" fill="black" style="pointer-events:all;cursor:pointer"/>`;
    let pad = base * 0.025 * unit,
      lineHeight = min(base * 0.06, 36) * 0.95 * unit;
    // 입력 시 화면 확대를 막는 16px은 유지하고 표시만 축소, 줄간격은 보정
    let textScale = 0.85,
      fieldLineHeight = lineHeight / textScale;
    Object.assign(importantInput.style, {
      display: importantProgress === 1 ? "block" : "none",
      pointerEvents: importantProgress === 1 ? "auto" : "none",
      left: x + pad + "px",
      top: y + pad - lineHeight * 0.12 + "px",
      width: Math.max(0, boxWidth - pad * 2) / textScale + "px",
      height: Math.max(0, boxHeight - pad * 2) / textScale + "px",
      fontSize: Math.max(16, min(base * 0.033, 22) * unit) + "px",
      transform: "scale(" + textScale + ")",
      transformOrigin: "top left",
      lineHeight: fieldLineHeight + "px",
      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${fieldLineHeight - 1 / textScale}px, #D8D8D8 ${fieldLineHeight - 1 / textScale}px, #D8D8D8 ${fieldLineHeight}px)`,
      backgroundAttachment: "local",
    });
  }

  const helpArtwork =
    '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 999.53 521.53">\n  <defs>\n    <style>\n      .cls-1 {\n        stroke: #4c71b7;\n      }\n\n      .cls-1, .cls-2 {\n        stroke-width: 2px;\n      }\n\n      .cls-1, .cls-2, .cls-3, .cls-4 {\n        stroke-linecap: round;\n      }\n\n      .cls-1, .cls-2, .cls-3, .cls-4, .cls-5 {\n        stroke-linejoin: round;\n      }\n\n      .cls-1, .cls-2, .cls-3, .cls-5 {\n        fill: none;\n      }\n\n      .cls-6, .cls-4 {\n        fill: #231f20;\n      }\n\n      .cls-2 {\n        stroke: #e53525;\n      }\n\n      .cls-7 {\n        fill: #fff;\n        stroke: #050606;\n        stroke-miterlimit: 10;\n        stroke-width: 1.96px;\n      }\n\n      .cls-3, .cls-4 {\n        stroke-width: 1.45px;\n      }\n\n      .cls-3, .cls-4, .cls-5 {\n        stroke: #231f20;\n      }\n\n      .cls-5 {\n        stroke-width: 1.51px;\n      }\n    </style>\n  </defs>\n  <rect class="cls-7" x="7.85" y="10.99" width="984.01" height="500.59" rx="1.24" ry="1.24"/>\n  <g>\n    <path class="cls-6" d="M33.94,60.85l10.93-22.13h2.53l-10.92,22.13h-2.55Z"/>\n    <path class="cls-6" d="M47.72,60.85l10.93-22.13h2.53l-10.92,22.13h-2.55Z"/>\n    <path class="cls-6" d="M88.7,39.16h7.39v2.66h-2.58v16.02h2.58v2.66h-8.03v-2.66h2.52v-16.02l-7.33,18.9h-.64l-7.28-18.9v16.02h2.35v2.66h-7.58v-2.66h2.59v-16.02h-2.59v-2.66h7.32l5.62,14.61,5.65-14.61Z"/>\n    <path class="cls-6" d="M110.77,50.87v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM103.86,58.5c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M122.06,57.89v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM119.96,40.6c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M137.97,50.49v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M34.79,124.18v-2.93h9.19v2.93h-9.19Z"/>\n    <path class="cls-6" d="M63.83,110.09v-1.46h2.61v6.47h-2.61v-1.47c-1.1-1.66-2.61-2.49-4.53-2.49-1.17,0-2.07.24-2.69.71s-.93,1.15-.93,2.04.29,1.5.89,1.94c.59.44,1.49.82,2.71,1.13l2.51.67c1.6.42,2.82.99,3.67,1.69.85.7,1.41,1.44,1.67,2.22.26.78.39,1.66.39,2.62,0,1.94-.6,3.47-1.81,4.6-1.21,1.13-2.83,1.7-4.86,1.7s-3.7-.71-5.28-2.12v1.77h-2.66v-7.77h2.66v1.88c1.27,2.34,2.94,3.51,4.98,3.51,1.2,0,2.13-.31,2.79-.93.66-.62.99-1.49.99-2.61,0-1.53-1.08-2.59-3.23-3.19l-2.66-.75c-1.92-.55-3.33-1.29-4.25-2.22-.92-.93-1.37-2.17-1.37-3.7,0-1.88.55-3.33,1.66-4.37,1.11-1.03,2.64-1.55,4.59-1.55,1.7,0,3.29.56,4.76,1.69Z"/>\n    <path class="cls-6" d="M72.13,117.84l2.82,8.96,2.83-8.96h-1.59v-2.62h7.15v2.62h-1.64l2.87,8.96,2.86-8.96h-2.05v-2.62h6.7v2.62h-2.15l-3.96,12.52h-2.76l-3.41-10.75-3.46,10.75h-2.73l-3.99-12.52h-1.8v-2.62h6.26v2.62h-1.94Z"/>\n    <path class="cls-6" d="M100.79,127.49v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM98.7,110.2c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M119.91,122.74c0,1.39-.32,2.69-.96,3.89-.64,1.21-1.52,2.16-2.63,2.86-1.11.7-2.34,1.05-3.69,1.05-1.99,0-3.73-.76-5.23-2.29v5.92h2.9v2.61h-8.52v-2.61h2.69v-16.33h-2.49v-2.62h5.42v2.38c.74-.87,1.55-1.52,2.44-1.94.89-.42,1.84-.64,2.85-.64,1.41,0,2.66.35,3.75,1.04,1.09.69,1.95,1.63,2.56,2.81s.91,2.47.91,3.87ZM112.59,127.86c.81,0,1.54-.24,2.19-.71s1.16-1.11,1.53-1.93.55-1.67.55-2.58-.2-1.76-.61-2.53c-.41-.77-.96-1.38-1.67-1.84-.71-.46-1.51-.69-2.39-.69s-1.76.24-2.49.73c-.74.49-1.31,1.13-1.71,1.93-.41.8-.61,1.69-.61,2.65,0,1.55.49,2.76,1.47,3.64s2.23,1.32,3.75,1.32Z"/>\n    <path class="cls-6" d="M137.82,123.4h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM129.93,117.26c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M153.31,124.12v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M168.17,127.49v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM166.07,110.2c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M182.52,117.37v-2.15h5.59v2.62h-2.69v11.16c0,2.6-.65,4.6-1.96,6.01-1.31,1.41-3.22,2.12-5.73,2.12-2.38,0-4.41-.67-6.09-2.01l1.88-2.11c.68.5,1.36.88,2.05,1.13.68.25,1.43.38,2.24.38,1.47,0,2.62-.46,3.46-1.37.83-.92,1.25-2.13,1.25-3.64v-1.39c-.64.76-1.46,1.35-2.44,1.78-.99.43-1.97.65-2.95.65-1.38,0-2.62-.35-3.72-1.05-1.1-.7-1.96-1.63-2.58-2.78-.62-1.16-.93-2.42-.93-3.8s.32-2.71.97-3.92c.65-1.21,1.53-2.17,2.66-2.89,1.12-.72,2.37-1.08,3.74-1.08.98,0,1.9.19,2.75.58.85.39,1.69.98,2.5,1.77ZM177.68,127.92c.93,0,1.76-.23,2.51-.69.75-.46,1.33-1.09,1.74-1.87.42-.78.62-1.63.62-2.53,0-.85-.21-1.67-.62-2.45-.42-.78-.99-1.42-1.73-1.9s-1.56-.72-2.46-.72-1.69.23-2.42.69c-.73.46-1.29,1.09-1.7,1.87-.41.78-.61,1.63-.61,2.53s.19,1.77.58,2.55c.39.77.94,1.39,1.65,1.84.71.45,1.53.68,2.44.68Z"/>\n    <path class="cls-6" d="M199.49,114.82c2.77,0,4.15,1.5,4.15,4.49v8.18h2.52v2.61h-5.45v-9.74c0-1.07-.15-1.82-.46-2.25-.31-.43-.78-.65-1.42-.65-1.09,0-2.5.64-4.23,1.91v8.13h2.58v2.61h-8.17v-2.61h2.66v-16.16h-2.66v-2.58h5.59v8.2c1.76-1.43,3.39-2.14,4.9-2.14Z"/>\n    <path class="cls-6" d="M215.23,115.22v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M226.69,119v-3.78h3.78v3.78h-3.78ZM226.69,130.1v-3.77h3.78v3.77h-3.78Z"/>\n    <path class="cls-6" d="M257.76,122.68c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM249.95,127.69c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M277.34,122.74c0,1.39-.32,2.69-.96,3.89-.64,1.21-1.52,2.16-2.63,2.86-1.11.7-2.34,1.05-3.69,1.05-1.99,0-3.73-.76-5.23-2.29v5.92h2.9v2.61h-8.52v-2.61h2.69v-16.33h-2.49v-2.62h5.42v2.38c.74-.87,1.55-1.52,2.44-1.94.89-.42,1.84-.64,2.85-.64,1.41,0,2.66.35,3.75,1.04,1.09.69,1.95,1.63,2.56,2.81s.91,2.47.91,3.87ZM270.02,127.86c.81,0,1.54-.24,2.19-.71s1.16-1.11,1.53-1.93.55-1.67.55-2.58-.2-1.76-.61-2.53c-.41-.77-.96-1.38-1.67-1.84-.71-.46-1.51-.69-2.39-.69s-1.76.24-2.49.73c-.74.49-1.31,1.13-1.71,1.93-.41.8-.61,1.69-.61,2.65,0,1.55.49,2.76,1.47,3.64s2.23,1.32,3.75,1.32Z"/>\n    <path class="cls-6" d="M295.25,123.4h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM287.37,117.26c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M311.64,120.09v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M339.28,122.68c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM331.47,127.69c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M346.5,117.84l3.21,8.44,3.2-8.44h-2.07v-2.62h7.14v2.62h-2.27l-4.74,12.52h-2.65l-4.84-12.52h-2.63v-2.62h7.59v2.62h-1.94Z"/>\n    <path class="cls-6" d="M375.27,123.4h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM367.38,117.26c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M382.9,124.12v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M396.21,117.84l3.21,8.44,3.2-8.44h-2.07v-2.62h7.14v2.62h-2.27l-4.74,12.52h-2.65l-4.84-12.52h-2.63v-2.62h7.59v2.62h-1.94Z"/>\n    <path class="cls-6" d="M416.41,127.49v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM414.31,110.2c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M433.87,123.4h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM425.98,117.26c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M439.76,117.84l2.82,8.96,2.83-8.96h-1.59v-2.62h7.15v2.62h-1.64l2.87,8.96,2.86-8.96h-2.05v-2.62h6.7v2.62h-2.15l-3.96,12.52h-2.76l-3.41-10.75-3.46,10.75h-2.73l-3.99-12.52h-1.8v-2.62h6.26v2.62h-1.94Z"/>\n    <path class="cls-6" d="M471.38,127.49v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M512.09,122.68c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM504.29,127.69c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M532.51,127.49v2.61h-5.59v-2.18c-1.49,1.62-3.27,2.44-5.34,2.44-1.44,0-2.7-.34-3.8-1.01-1.1-.67-1.95-1.59-2.56-2.75s-.91-2.44-.91-3.85.32-2.76.97-3.96c.65-1.21,1.54-2.17,2.68-2.88,1.14-.71,2.38-1.07,3.71-1.07.96,0,1.88.19,2.74.58s1.7,1,2.51,1.83v-5.89h-2.87v-2.58h5.78v18.73h2.69ZM522.13,127.75c.91,0,1.72-.24,2.45-.72.73-.48,1.3-1.12,1.71-1.93.42-.8.62-1.66.62-2.58s-.21-1.77-.62-2.53c-.42-.76-.99-1.37-1.73-1.81s-1.57-.67-2.49-.67-1.7.24-2.4.72c-.7.48-1.26,1.11-1.66,1.9-.41.79-.61,1.63-.61,2.53,0,.96.21,1.83.62,2.61.42.77.98,1.38,1.7,1.83.72.44,1.52.67,2.41.67Z"/>\n    <path class="cls-6" d="M549.68,123.4h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM541.8,117.26c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M34.79,158.98v-2.93h9.19v2.93h-9.19Z"/>\n    <path class="cls-6" d="M73.26,153.91c0,3.65-1.1,6.4-3.31,8.23-2.2,1.84-5.48,2.75-9.83,2.75h-7.97v-2.66h2.86v-16.02h-2.86v-2.66h8.11c4.37,0,7.63.83,9.78,2.48,2.15,1.65,3.22,4.28,3.22,7.87ZM69.75,154.05c0-1.81-.32-3.29-.96-4.43s-1.65-1.99-3.03-2.56c-1.38-.56-3.21-.84-5.47-.84h-2.05v16.02h2.02c3.29,0,5.69-.66,7.21-1.98,1.52-1.32,2.28-3.39,2.28-6.21Z"/>\n    <path class="cls-6" d="M91.45,157.48c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM83.64,162.49c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M100.32,162.6c1.31,0,2.73-.64,4.26-1.91v-8.06h-2.63v-2.62h5.56v12.28h2.55v2.61h-5.48v-1.71c-1.72,1.31-3.35,1.97-4.9,1.97-1.4,0-2.43-.42-3.09-1.25s-1-2.21-1-4.13v-7.14h-2.08v-2.62h5.01v10.37c0,.76.14,1.33.42,1.69.28.36.74.54,1.38.54Z"/>\n    <path class="cls-6" d="M122.16,149.62c1.37,0,2.61.35,3.71,1.04,1.1.69,1.97,1.63,2.58,2.81.62,1.18.93,2.45.93,3.82s-.31,2.72-.94,3.92c-.63,1.2-1.49,2.15-2.6,2.87-1.1.71-2.34,1.07-3.71,1.07-1.09,0-2.12-.22-3.09-.67s-1.74-1.05-2.3-1.83v2.24h-5.48v-2.61h2.63v-16.16h-2.63v-2.58h5.48v8.58c1.49-1.68,3.3-2.52,5.42-2.52ZM121.55,162.55c.93,0,1.75-.25,2.48-.75.73-.5,1.29-1.16,1.69-1.97s.59-1.68.59-2.59-.2-1.74-.61-2.49c-.41-.76-.97-1.35-1.69-1.8-.72-.44-1.53-.67-2.44-.67s-1.72.23-2.44.69c-.72.46-1.28,1.09-1.69,1.88-.41.79-.61,1.68-.61,2.65s.21,1.77.62,2.55c.42.77.98,1.38,1.7,1.83.72.44,1.51.67,2.38.67Z"/>\n    <path class="cls-6" d="M138.87,162.29v2.61h-7.83v-2.61h2.63v-16.16h-2.63v-2.58h5.56v18.73h2.27Z"/>\n    <path class="cls-6" d="M156.61,158.2h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM148.72,152.06c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M178.16,151.09v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M190.34,162.29v2.61h-7.83v-2.61h2.63v-16.16h-2.63v-2.58h5.56v18.73h2.27Z"/>\n    <path class="cls-6" d="M199.5,162.29v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM197.41,145c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M212.73,151.09v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M228.06,152.45h-2.35v-2.44h8.24v2.44h-2.29l-5.56,4.62,5.25,5.23h2.61v2.61h-3.87l-7.45-7.5v4.9h2.52v2.61h-8.11v-2.61h2.66v-16.16h-2.66v-2.58h5.59v13.45l5.42-4.56Z"/>\n    <path class="cls-6" d="M254.87,151.09v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M266.9,162.29v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM264.81,145c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M274.07,158.92v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M291.53,151.09v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M303.71,162.29v2.61h-7.83v-2.61h2.63v-16.16h-2.63v-2.58h5.56v18.73h2.27Z"/>\n    <path class="cls-6" d="M321.45,158.2h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM313.56,152.06c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M333.1,153.8v-3.78h3.78v3.78h-3.78ZM333.1,164.9v-3.77h3.78v3.77h-3.78Z"/>\n    <path class="cls-6" d="M364.26,158.2h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM356.37,152.06c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M380.64,154.89v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M392.24,150.02v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M409.96,158.2h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM402.08,152.06c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M417.6,158.92v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M451.38,162.29v2.61h-5.59v-2.18c-1.49,1.62-3.27,2.44-5.34,2.44-1.44,0-2.7-.34-3.8-1.01-1.1-.67-1.95-1.59-2.56-2.75s-.91-2.44-.91-3.85.32-2.76.97-3.96c.65-1.21,1.54-2.17,2.68-2.88,1.14-.71,2.38-1.07,3.71-1.07.96,0,1.88.19,2.74.58s1.7,1,2.51,1.83v-5.89h-2.87v-2.58h5.78v18.73h2.69ZM441,162.55c.91,0,1.72-.24,2.45-.72.73-.48,1.3-1.12,1.71-1.93.42-.8.62-1.66.62-2.58s-.21-1.77-.62-2.53c-.42-.76-.99-1.37-1.73-1.81s-1.57-.67-2.49-.67-1.7.24-2.4.72c-.7.48-1.26,1.11-1.66,1.9-.41.79-.61,1.63-.61,2.53,0,.96.21,1.83.62,2.61.42.77.98,1.38,1.7,1.83.72.44,1.52.67,2.41.67Z"/>\n    <path class="cls-6" d="M458.26,158.92v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M478.66,155.27v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM471.75,162.9c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M486.49,152.64l2.82,8.96,2.83-8.96h-1.59v-2.62h7.15v2.62h-1.64l2.87,8.96,2.86-8.96h-2.05v-2.62h6.7v2.62h-2.15l-3.96,12.52h-2.76l-3.41-10.75-3.46,10.75h-2.73l-3.99-12.52h-1.8v-2.62h6.26v2.62h-1.94Z"/>\n    <path class="cls-6" d="M515.15,162.29v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM513.05,145c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M531.06,154.89v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M547.83,152.17v-2.15h5.59v2.62h-2.69v11.16c0,2.6-.65,4.6-1.96,6.01-1.31,1.41-3.22,2.12-5.73,2.12-2.38,0-4.41-.67-6.09-2.01l1.88-2.11c.68.5,1.36.88,2.05,1.13.68.25,1.43.38,2.24.38,1.47,0,2.62-.46,3.46-1.37.83-.92,1.25-2.13,1.25-3.64v-1.39c-.64.76-1.46,1.35-2.44,1.78-.99.43-1.97.65-2.95.65-1.38,0-2.62-.35-3.72-1.05-1.1-.7-1.96-1.63-2.58-2.78-.62-1.16-.93-2.42-.93-3.8s.32-2.71.97-3.92c.65-1.21,1.53-2.17,2.66-2.89,1.12-.72,2.37-1.08,3.74-1.08.98,0,1.9.19,2.75.58.85.39,1.69.98,2.5,1.77ZM542.98,162.72c.93,0,1.76-.23,2.51-.69.75-.46,1.33-1.09,1.74-1.87.42-.78.62-1.63.62-2.53,0-.85-.21-1.67-.62-2.45-.42-.78-.99-1.42-1.73-1.9s-1.56-.72-2.46-.72-1.69.23-2.42.69c-.73.46-1.29,1.09-1.7,1.87-.41.78-.61,1.63-.61,2.53s.19,1.77.58,2.55c.39.77.94,1.39,1.65,1.84.71.45,1.53.68,2.44.68Z"/>\n    <path class="cls-6" d="M564.98,162.29v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M605.69,157.48c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM597.88,162.49c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M626.11,162.29v2.61h-5.59v-2.18c-1.49,1.62-3.27,2.44-5.34,2.44-1.44,0-2.7-.34-3.8-1.01-1.1-.67-1.95-1.59-2.56-2.75s-.91-2.44-.91-3.85.32-2.76.97-3.96c.65-1.21,1.54-2.17,2.68-2.88,1.14-.71,2.38-1.07,3.71-1.07.96,0,1.88.19,2.74.58s1.7,1,2.51,1.83v-5.89h-2.87v-2.58h5.78v18.73h2.69ZM615.73,162.55c.91,0,1.72-.24,2.45-.72.73-.48,1.3-1.12,1.71-1.93.42-.8.62-1.66.62-2.58s-.21-1.77-.62-2.53c-.42-.76-.99-1.37-1.73-1.81s-1.57-.67-2.49-.67-1.7.24-2.4.72c-.7.48-1.26,1.11-1.66,1.9-.41.79-.61,1.63-.61,2.53,0,.96.21,1.83.62,2.61.42.77.98,1.38,1.7,1.83.72.44,1.52.67,2.41.67Z"/>\n    <path class="cls-6" d="M643.28,158.2h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM635.39,152.06c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M34.79,193.78v-2.93h9.19v2.93h-9.19Z"/>\n    <path class="cls-6" d="M70.97,180.71v-2.35h2.72v6.84h-2.78c-.7-1.37-1.66-2.44-2.87-3.2s-2.55-1.15-4.01-1.15-2.66.37-3.77,1.11c-1.1.74-1.97,1.73-2.58,2.97-.62,1.24-.93,2.57-.93,4s.32,2.83.97,4.08c.65,1.25,1.54,2.24,2.67,2.99s2.39,1.12,3.78,1.12c1.71,0,3.22-.52,4.53-1.56,1.31-1.04,2.27-2.52,2.87-4.44l2.72,1.44c-.74,2.38-2.04,4.22-3.9,5.53-1.86,1.31-4.05,1.96-6.56,1.96-2.07,0-3.9-.49-5.51-1.48-1.6-.99-2.85-2.31-3.75-3.98-.89-1.67-1.34-3.5-1.34-5.49,0-2.16.46-4.09,1.37-5.78.91-1.69,2.17-3,3.77-3.93,1.6-.93,3.44-1.39,5.51-1.39,1.39,0,2.67.23,3.84.69,1.17.46,2.25,1.13,3.24,2.01Z"/>\n    <path class="cls-6" d="M84.08,197.09v2.61h-7.83v-2.61h2.63v-16.16h-2.63v-2.58h5.56v18.73h2.27Z"/>\n    <path class="cls-6" d="M93.24,197.09v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM91.15,179.8c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M106.47,185.89v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M121.81,187.25h-2.35v-2.44h8.24v2.44h-2.29l-5.56,4.62,5.25,5.23h2.61v2.61h-3.87l-7.45-7.5v4.9h2.52v2.61h-8.11v-2.61h2.66v-16.16h-2.66v-2.58h5.59v13.45l5.42-4.56Z"/>\n    <path class="cls-6" d="M146.15,185.45v-.64h2.55v4.94h-2.55v-.91c-.85-1.22-2.01-1.83-3.48-1.83-.77,0-1.41.17-1.9.51-.49.34-.74.78-.74,1.32,0,.48.19.86.56,1.13.37.27,1.21.51,2.51.72l1.97.38c2.94.54,4.4,1.98,4.4,4.32,0,1.37-.53,2.47-1.59,3.3s-2.47,1.25-4.23,1.25c-.7,0-1.39-.1-2.06-.3-.68-.2-1.24-.46-1.69-.76v.81h-2.61v-5.1h2.61v.51c.14.72.54,1.29,1.2,1.73.66.43,1.42.65,2.29.65.95,0,1.7-.17,2.25-.5.55-.33.82-.83.82-1.49,0-.48-.22-.84-.65-1.08-.43-.24-1.31-.49-2.62-.74l-1.52-.33c-1.5-.3-2.6-.82-3.3-1.56-.7-.74-1.05-1.68-1.05-2.82,0-.93.26-1.72.77-2.37.51-.66,1.17-1.15,1.98-1.48.8-.33,1.63-.5,2.48-.5,1.43,0,2.62.28,3.6.84Z"/>\n    <path class="cls-6" d="M159.13,184.82v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M173.82,190.07v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM166.91,197.7c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M183.39,193.72v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M209.31,184.42c1.37,0,2.61.35,3.71,1.04,1.1.69,1.97,1.63,2.58,2.81.62,1.18.93,2.45.93,3.82s-.31,2.72-.94,3.92c-.63,1.2-1.49,2.15-2.6,2.87-1.1.71-2.34,1.07-3.71,1.07-1.09,0-2.12-.22-3.09-.67s-1.74-1.05-2.3-1.83v2.24h-5.48v-2.61h2.63v-16.16h-2.63v-2.58h5.48v8.58c1.49-1.68,3.3-2.52,5.42-2.52ZM208.71,197.35c.93,0,1.75-.25,2.48-.75.73-.5,1.29-1.16,1.69-1.97s.59-1.68.59-2.59-.2-1.74-.61-2.49c-.41-.76-.97-1.35-1.69-1.8-.72-.44-1.53-.67-2.44-.67s-1.72.23-2.44.69c-.72.46-1.28,1.09-1.69,1.88-.41.79-.61,1.68-.61,2.65s.21,1.77.62,2.55c.42.77.98,1.38,1.7,1.83.72.44,1.51.67,2.38.67Z"/>\n    <path class="cls-6" d="M234.38,192.28c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM226.58,197.29c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M240.65,187.44l2.69,2.93,2.51-2.93h-1.52v-2.62h7.02v2.62h-2.46l-3.92,4.46,4.73,5.2h1.66v2.61h-7.02v-2.61h1.91l-2.96-3.37-2.92,3.37h1.91v2.61h-7.19v-2.61h2.17l4.47-5.03-4.23-4.63h-2.04v-2.62h7v2.62h-1.8Z"/>\n    <path class="cls-6" d="M262.36,188.6v-3.78h3.78v3.78h-3.78ZM262.36,199.7v-3.77h3.78v3.77h-3.78Z"/>\n    <path class="cls-6" d="M281.48,187.44l2.82,8.96,2.83-8.96h-1.59v-2.62h7.15v2.62h-1.64l2.87,8.96,2.86-8.96h-2.05v-2.62h6.7v2.62h-2.15l-3.96,12.52h-2.76l-3.41-10.75-3.46,10.75h-2.73l-3.99-12.52h-1.8v-2.62h6.26v2.62h-1.94Z"/>\n    <path class="cls-6" d="M308.42,193.72v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M323.28,197.09v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM321.18,179.8c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M332.47,184.82v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M350.19,193h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM342.31,186.86c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M372.94,190.07v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM366.03,197.7c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M391.26,189.69v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M410.4,197.09v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM408.31,179.8c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M414.38,197.09v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M456.83,192.34c0,1.39-.32,2.69-.96,3.89-.64,1.21-1.52,2.16-2.63,2.86-1.11.7-2.34,1.05-3.69,1.05-1.99,0-3.73-.76-5.23-2.29v5.92h2.9v2.61h-8.52v-2.61h2.69v-16.33h-2.49v-2.62h5.42v2.38c.74-.87,1.55-1.52,2.44-1.94.89-.42,1.84-.64,2.85-.64,1.41,0,2.66.35,3.75,1.04,1.09.69,1.95,1.63,2.56,2.81s.91,2.47.91,3.87ZM449.51,197.46c.81,0,1.54-.24,2.19-.71s1.16-1.11,1.53-1.93.55-1.67.55-2.58-.2-1.76-.61-2.53c-.41-.77-.96-1.38-1.67-1.84-.71-.46-1.51-.69-2.39-.69s-1.76.24-2.49.73c-.74.49-1.31,1.13-1.71,1.93-.41.8-.61,1.69-.61,2.65,0,1.55.49,2.76,1.47,3.64s2.23,1.32,3.75,1.32Z"/>\n    <path class="cls-6" d="M474.66,192.28c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM466.86,197.29c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M482.29,193.72v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M497.46,184.82v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M512.14,190.07v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM505.23,197.7c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M530.47,189.69v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M542.06,184.82v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M566.11,189.69v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M585.89,192.28c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM578.09,197.29c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M595.55,184.82v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M613.28,193h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM605.39,186.86c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M34.79,228.58v-2.93h9.19v2.93h-9.19Z"/>\n    <path class="cls-6" d="M70.97,215.51v-2.35h2.72v6.84h-2.78c-.7-1.37-1.66-2.44-2.87-3.2s-2.55-1.15-4.01-1.15-2.66.37-3.77,1.11c-1.1.74-1.97,1.73-2.58,2.97-.62,1.24-.93,2.57-.93,4s.32,2.83.97,4.08c.65,1.25,1.54,2.24,2.67,2.99s2.39,1.12,3.78,1.12c1.71,0,3.22-.52,4.53-1.56,1.31-1.04,2.27-2.52,2.87-4.44l2.72,1.44c-.74,2.38-2.04,4.22-3.9,5.53-1.86,1.31-4.05,1.96-6.56,1.96-2.07,0-3.9-.49-5.51-1.48-1.6-.99-2.85-2.31-3.75-3.98-.89-1.67-1.34-3.5-1.34-5.49,0-2.16.46-4.09,1.37-5.78.91-1.69,2.17-3,3.77-3.93,1.6-.93,3.44-1.39,5.51-1.39,1.39,0,2.67.23,3.84.69,1.17.46,2.25,1.13,3.24,2.01Z"/>\n    <path class="cls-6" d="M84.08,231.89v2.61h-7.83v-2.61h2.63v-16.16h-2.63v-2.58h5.56v18.73h2.27Z"/>\n    <path class="cls-6" d="M93.24,231.89v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM91.15,214.6c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M106.47,220.69v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M121.81,222.05h-2.35v-2.44h8.24v2.44h-2.29l-5.56,4.62,5.25,5.23h2.61v2.61h-3.87l-7.45-7.5v4.9h2.52v2.61h-8.11v-2.61h2.66v-16.16h-2.66v-2.58h5.59v13.45l5.42-4.56Z"/>\n    <path class="cls-6" d="M149.8,224.87v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM142.89,232.5c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M173.29,220.69v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M185.33,231.89v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM183.23,214.6c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M192.49,228.52v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M209.95,220.69v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M222.13,231.89v2.61h-7.83v-2.61h2.63v-16.16h-2.63v-2.58h5.56v18.73h2.27Z"/>\n    <path class="cls-6" d="M239.87,227.8h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM231.99,221.66c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M251.53,223.4v-3.78h3.78v3.78h-3.78ZM251.53,234.5v-3.77h3.78v3.77h-3.78Z"/>\n    <path class="cls-6" d="M274.41,219.62v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M292.14,227.8h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM284.25,221.66c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M299.27,222.24l2.69,2.93,2.51-2.93h-1.52v-2.62h7.02v2.62h-2.46l-3.92,4.46,4.73,5.2h1.66v2.61h-7.02v-2.61h1.91l-2.96-3.37-2.92,3.37h1.91v2.61h-7.19v-2.61h2.17l4.47-5.03-4.23-4.63h-2.04v-2.62h7v2.62h-1.8Z"/>\n    <path class="cls-6" d="M318.99,219.62v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M336.3,219.62v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M343.36,222.24l3.23,8.41,3.13-8.41h-1.98v-2.62h7.11v2.62h-2.19l-7.35,18.93h-4.96v-2.55h2.93l1.77-4.38-4.87-12.01h-2.49v-2.62h7.45v2.62h-1.77Z"/>\n    <path class="cls-6" d="M373.79,227.14c0,1.39-.32,2.69-.96,3.89-.64,1.21-1.52,2.16-2.63,2.86-1.11.7-2.34,1.05-3.69,1.05-1.99,0-3.73-.76-5.23-2.29v5.92h2.9v2.61h-8.52v-2.61h2.69v-16.33h-2.49v-2.62h5.42v2.38c.74-.87,1.55-1.52,2.44-1.94.89-.42,1.84-.64,2.85-.64,1.41,0,2.66.35,3.75,1.04,1.09.69,1.95,1.63,2.56,2.81s.91,2.47.91,3.87ZM366.46,232.26c.81,0,1.54-.24,2.19-.71s1.16-1.11,1.53-1.93.55-1.67.55-2.58-.2-1.76-.61-2.53c-.41-.77-.96-1.38-1.67-1.84-.71-.46-1.51-.69-2.39-.69s-1.76.24-2.49.73c-.74.49-1.31,1.13-1.71,1.93-.41.8-.61,1.69-.61,2.65,0,1.55.49,2.76,1.47,3.64s2.23,1.32,3.75,1.32Z"/>\n    <path class="cls-6" d="M383.12,231.89v2.61h-7.52v-2.61h2.32v-9.66h-2.32v-2.62h5.25v12.28h2.27ZM381.02,214.6c0,.48-.17.9-.52,1.25-.35.35-.76.52-1.25.52s-.89-.17-1.23-.52-.51-.76-.51-1.25.17-.9.51-1.25.75-.52,1.23-.52.92.17,1.26.51.51.76.51,1.26Z"/>\n    <path class="cls-6" d="M399.03,224.49v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M415.8,221.77v-2.15h5.59v2.62h-2.69v11.16c0,2.6-.65,4.6-1.96,6.01-1.31,1.41-3.22,2.12-5.73,2.12-2.38,0-4.41-.67-6.09-2.01l1.88-2.11c.68.5,1.36.88,2.05,1.13.68.25,1.43.38,2.24.38,1.47,0,2.62-.46,3.46-1.37.83-.92,1.25-2.13,1.25-3.64v-1.39c-.64.76-1.46,1.35-2.44,1.78-.99.43-1.97.65-2.95.65-1.38,0-2.62-.35-3.72-1.05-1.1-.7-1.96-1.63-2.58-2.78-.62-1.16-.93-2.42-.93-3.8s.32-2.71.97-3.92c.65-1.21,1.53-2.17,2.66-2.89,1.12-.72,2.37-1.08,3.74-1.08.98,0,1.9.19,2.75.58.85.39,1.69.98,2.5,1.77ZM410.96,232.32c.93,0,1.76-.23,2.51-.69.75-.46,1.33-1.09,1.74-1.87.42-.78.62-1.63.62-2.53,0-.85-.21-1.67-.62-2.45-.42-.78-.99-1.42-1.73-1.9s-1.56-.72-2.46-.72-1.69.23-2.42.69c-.73.46-1.29,1.09-1.7,1.87-.41.78-.61,1.63-.61,2.53s.19,1.77.58,2.55c.39.77.94,1.39,1.65,1.84.71.45,1.53.68,2.44.68Z"/>\n    <path class="cls-6" d="M432.95,231.89v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M473.66,227.08c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM465.85,232.09c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M494.08,231.89v2.61h-5.59v-2.18c-1.49,1.62-3.27,2.44-5.34,2.44-1.44,0-2.7-.34-3.8-1.01-1.1-.67-1.95-1.59-2.56-2.75s-.91-2.44-.91-3.85.32-2.76.97-3.96c.65-1.21,1.54-2.17,2.68-2.88,1.14-.71,2.38-1.07,3.71-1.07.96,0,1.88.19,2.74.58s1.7,1,2.51,1.83v-5.89h-2.87v-2.58h5.78v18.73h2.69ZM483.7,232.15c.91,0,1.72-.24,2.45-.72.73-.48,1.3-1.12,1.71-1.93.42-.8.62-1.66.62-2.58s-.21-1.77-.62-2.53c-.42-.76-.99-1.37-1.73-1.81s-1.57-.67-2.49-.67-1.7.24-2.4.72c-.7.48-1.26,1.11-1.66,1.9-.41.79-.61,1.63-.61,2.53,0,.96.21,1.83.62,2.61.42.77.98,1.38,1.7,1.83.72.44,1.52.67,2.41.67Z"/>\n    <path class="cls-6" d="M511.25,227.8h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM503.36,221.66c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M35.88,256.21v-2.41h16.79v2.41h-16.79ZM35.88,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M56.85,256.21v-2.41h16.79v2.41h-16.79ZM56.85,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M77.82,256.21v-2.41h16.79v2.41h-16.79ZM77.82,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M98.79,256.21v-2.41h16.79v2.41h-16.79ZM98.79,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M119.76,256.21v-2.41h16.79v2.41h-16.79ZM119.76,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M140.73,256.21v-2.41h16.79v2.41h-16.79ZM140.73,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M161.71,256.21v-2.41h16.79v2.41h-16.79ZM161.71,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M182.68,256.21v-2.41h16.79v2.41h-16.79ZM182.68,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M203.65,256.21v-2.41h16.79v2.41h-16.79ZM203.65,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M224.62,256.21v-2.41h16.79v2.41h-16.79ZM224.62,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M245.59,256.21v-2.41h16.79v2.41h-16.79ZM245.59,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M266.56,256.21v-2.41h16.79v2.41h-16.79ZM266.56,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M287.53,256.21v-2.41h16.79v2.41h-16.79ZM287.53,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M308.5,256.21v-2.41h16.79v2.41h-16.79ZM308.5,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M329.48,256.21v-2.41h16.79v2.41h-16.79ZM329.48,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M350.45,256.21v-2.41h16.79v2.41h-16.79ZM350.45,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M371.42,256.21v-2.41h16.79v2.41h-16.79ZM371.42,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M392.39,256.21v-2.41h16.79v2.41h-16.79ZM392.39,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M413.36,256.21v-2.41h16.79v2.41h-16.79ZM413.36,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M434.33,256.21v-2.41h16.79v2.41h-16.79ZM434.33,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M455.3,256.21v-2.41h16.79v2.41h-16.79ZM455.3,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M476.27,256.21v-2.41h16.79v2.41h-16.79ZM476.27,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M497.25,256.21v-2.41h16.79v2.41h-16.79ZM497.25,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M518.22,256.21v-2.41h16.79v2.41h-16.79ZM518.22,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M539.19,256.21v-2.41h16.79v2.41h-16.79ZM539.19,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M560.16,256.21v-2.41h16.79v2.41h-16.79ZM560.16,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M581.13,256.21v-2.41h16.79v2.41h-16.79ZM581.13,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M602.1,256.21v-2.41h16.79v2.41h-16.79ZM602.1,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M623.07,256.21v-2.41h16.79v2.41h-16.79ZM623.07,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M644.04,256.21v-2.41h16.79v2.41h-16.79ZM644.04,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M665.01,256.21v-2.41h16.79v2.41h-16.79ZM665.01,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M685.99,256.21v-2.41h16.79v2.41h-16.79ZM685.99,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M706.96,256.21v-2.41h16.79v2.41h-16.79ZM706.96,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M727.93,256.21v-2.41h16.79v2.41h-16.79ZM727.93,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M748.9,256.21v-2.41h16.79v2.41h-16.79ZM748.9,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M769.87,256.21v-2.41h16.79v2.41h-16.79ZM769.87,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M790.84,256.21v-2.41h16.79v2.41h-16.79ZM790.84,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M811.81,256.21v-2.41h16.79v2.41h-16.79ZM811.81,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M832.78,256.21v-2.41h16.79v2.41h-16.79ZM832.78,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M853.76,256.21v-2.41h16.79v2.41h-16.79ZM853.76,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M874.73,256.21v-2.41h16.79v2.41h-16.79ZM874.73,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M895.7,256.21v-2.41h16.79v2.41h-16.79ZM895.7,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M916.67,256.21v-2.41h16.79v2.41h-16.79ZM916.67,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M937.64,256.21v-2.41h16.79v2.41h-16.79ZM937.64,263.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M33.94,339.25l10.93-22.13h2.53l-10.92,22.13h-2.55Z"/>\n    <path class="cls-6" d="M47.72,339.25l10.93-22.13h2.53l-10.92,22.13h-2.55Z"/>\n    <path class="cls-6" d="M84.82,325.36v-5.14h-4.4v16.02h2.78v2.66h-8.72v-2.66h2.72v-16.02h-4.38v5.14h-2.63v-7.8h17.28v7.8h-2.63Z"/>\n    <path class="cls-6" d="M103.76,332.2h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM95.88,326.06c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M110.9,326.64l2.69,2.93,2.51-2.93h-1.52v-2.62h7.02v2.62h-2.46l-3.92,4.46,4.73,5.2h1.66v2.61h-7.02v-2.61h1.91l-2.96-3.37-2.92,3.37h1.91v2.61h-7.19v-2.61h2.17l4.47-5.03-4.23-4.63h-2.04v-2.62h7v2.62h-1.8Z"/>\n    <path class="cls-6" d="M130.61,324.02v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M142.72,336.29v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M183.51,332.2h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM175.63,326.06c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M187.96,336.29v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M228.67,331.48c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM220.87,336.49c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M240.97,336.29v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M281.69,331.48c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM273.88,336.49c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M302.1,336.29v2.61h-5.59v-2.18c-1.49,1.62-3.27,2.44-5.34,2.44-1.44,0-2.7-.34-3.8-1.01-1.1-.67-1.95-1.59-2.56-2.75s-.91-2.44-.91-3.85.32-2.76.97-3.96c.65-1.21,1.54-2.17,2.68-2.88,1.14-.71,2.38-1.07,3.71-1.07.96,0,1.88.19,2.74.58s1.7,1,2.51,1.83v-5.89h-2.87v-2.58h5.78v18.73h2.69ZM291.72,336.55c.91,0,1.72-.24,2.45-.72.73-.48,1.3-1.12,1.71-1.93.42-.8.62-1.66.62-2.58s-.21-1.77-.62-2.53c-.42-.76-.99-1.37-1.73-1.81s-1.57-.67-2.49-.67-1.7.24-2.4.72c-.7.48-1.26,1.11-1.66,1.9-.41.79-.61,1.63-.61,2.53,0,.96.21,1.83.62,2.61.42.77.98,1.38,1.7,1.83.72.44,1.52.67,2.41.67Z"/>\n    <path class="cls-6" d="M319.28,332.2h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM311.39,326.06c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M55.26,397.51c0,3.65-1.1,6.4-3.31,8.23-2.2,1.84-5.48,2.75-9.83,2.75h-7.97v-2.66h2.86v-16.02h-2.86v-2.66h8.11c4.37,0,7.63.83,9.78,2.48,2.15,1.65,3.22,4.28,3.22,7.87ZM51.75,397.65c0-1.81-.32-3.29-.96-4.43s-1.65-1.99-3.03-2.56c-1.38-.56-3.21-.84-5.47-.84h-2.05v16.02h2.02c3.29,0,5.69-.66,7.21-1.98,1.52-1.32,2.28-3.39,2.28-6.21Z"/>\n    <path class="cls-6" d="M63.24,402.52v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M83.63,398.87v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM76.72,406.5c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M100.39,395.77v-2.15h5.59v2.62h-2.69v11.16c0,2.6-.65,4.6-1.96,6.01-1.31,1.41-3.22,2.12-5.73,2.12-2.38,0-4.41-.67-6.09-2.01l1.88-2.11c.68.5,1.36.88,2.05,1.13.68.25,1.43.38,2.24.38,1.47,0,2.62-.46,3.46-1.37.83-.92,1.25-2.13,1.25-3.64v-1.39c-.64.76-1.46,1.35-2.44,1.78-.99.43-1.97.65-2.95.65-1.38,0-2.62-.35-3.72-1.05-1.1-.7-1.96-1.63-2.58-2.78-.62-1.16-.93-2.42-.93-3.8s.32-2.71.97-3.92c.65-1.21,1.53-2.17,2.66-2.89,1.12-.72,2.37-1.08,3.74-1.08.98,0,1.9.19,2.75.58.85.39,1.69.98,2.5,1.77ZM95.55,406.32c.93,0,1.76-.23,2.51-.69.75-.46,1.33-1.09,1.74-1.87.42-.78.62-1.63.62-2.53,0-.85-.21-1.67-.62-2.45-.42-.78-.99-1.42-1.73-1.9s-1.56-.72-2.46-.72-1.69.23-2.42.69c-.73.46-1.29,1.09-1.7,1.87-.41.78-.61,1.63-.61,2.53s.19,1.77.58,2.55c.39.77.94,1.39,1.65,1.84.71.45,1.53.68,2.44.68Z"/>\n    <path class="cls-6" d="M130.94,401.08c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM123.13,406.09c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M139.81,406.2c1.31,0,2.73-.64,4.26-1.91v-8.06h-2.63v-2.62h5.56v12.28h2.55v2.61h-5.48v-1.71c-1.72,1.31-3.35,1.97-4.9,1.97-1.4,0-2.43-.42-3.09-1.25s-1-2.21-1-4.13v-7.14h-2.08v-2.62h5.01v10.37c0,.76.14,1.33.42,1.69.28.36.74.54,1.38.54Z"/>\n    <path class="cls-6" d="M158.75,393.62v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M164.44,396.24l2.82,8.96,2.83-8.96h-1.59v-2.62h7.15v2.62h-1.64l2.87,8.96,2.86-8.96h-2.05v-2.62h6.7v2.62h-2.15l-3.96,12.52h-2.76l-3.41-10.75-3.46,10.75h-2.73l-3.99-12.52h-1.8v-2.62h6.26v2.62h-1.94Z"/>\n    <path class="cls-6" d="M197.77,398.87v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM190.86,406.5c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M207.34,402.52v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M231.53,405.89v2.61h-5.59v-2.18c-1.49,1.62-3.27,2.44-5.34,2.44-1.44,0-2.7-.34-3.8-1.01-1.1-.67-1.95-1.59-2.56-2.75s-.91-2.44-.91-3.85.32-2.76.97-3.96c.65-1.21,1.54-2.17,2.68-2.88,1.14-.71,2.38-1.07,3.71-1.07.96,0,1.88.19,2.74.58s1.7,1,2.51,1.83v-5.89h-2.87v-2.58h5.78v18.73h2.69ZM221.15,406.15c.91,0,1.72-.24,2.45-.72.73-.48,1.3-1.12,1.71-1.93.42-.8.62-1.66.62-2.58s-.21-1.77-.62-2.53c-.42-.76-.99-1.37-1.73-1.81s-1.57-.67-2.49-.67-1.7.24-2.4.72c-.7.48-1.26,1.11-1.66,1.9-.41.79-.61,1.63-.61,2.53,0,.96.21,1.83.62,2.61.42.77.98,1.38,1.7,1.83.72.44,1.52.67,2.41.67Z"/>\n    <path class="cls-6" d="M250.56,390.15l-2.61.4c-.08-.96-.45-1.44-1.1-1.44-.46,0-.77.17-.93.5s-.23.92-.23,1.77v2.25h2.55v2.62h-2.55v9.66h2.8v2.61h-7.92v-2.61h2.18v-9.66h-2.18v-2.62h2.18v-2.31c0-1.36.33-2.46,1-3.31s1.65-1.27,2.95-1.27c1.08,0,1.94.29,2.6.86.66.57,1.07,1.43,1.25,2.57Z"/>\n    <path class="cls-6" d="M255.43,402.52v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M277.04,401.08c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM269.24,406.09c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M281.49,405.89v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M327.1,398.87v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM320.19,406.5c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M345.42,398.49v7.41h2.49v2.61h-5.42v-9.83c0-.93-.13-1.6-.4-2.01s-.71-.61-1.32-.61c-1.3,0-2.77.64-4.39,1.93v7.92h2.56v2.61h-8.07v-2.61h2.62v-9.66h-2.62v-2.62h5.51v1.8c1.82-1.33,3.54-2,5.14-2,1.33,0,2.32.41,2.95,1.23s.96,2.1.96,3.84Z"/>\n    <path class="cls-6" d="M370.1,398.87v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM363.19,406.5c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M379.67,402.52v3.37h3.24v2.61h-9.13v-2.61h2.99v-9.66h-2.99v-2.62h5.31v3.37c.59-1.33,1.33-2.26,2.22-2.78.88-.52,2.15-.79,3.79-.79h.67v2.96h-.64c-1.59,0-2.77.21-3.54.62-.77.42-1.29,1.04-1.54,1.88-.25.84-.38,2.05-.38,3.64Z"/>\n    <path class="cls-6" d="M397.13,394.69v-1.08h2.61v5.64h-2.61c-.11-1.09-.55-1.91-1.3-2.48-.76-.57-1.63-.86-2.62-.86-.85,0-1.61.23-2.29.68-.68.45-1.2,1.07-1.56,1.84s-.55,1.62-.55,2.53c0,1.56.42,2.83,1.25,3.82.83.99,1.93,1.48,3.29,1.48,2.1,0,3.59-.98,4.46-2.93l2.44,1.16c-1.37,2.96-3.71,4.45-7.02,4.45-1.48,0-2.8-.35-3.95-1.05-1.15-.7-2.04-1.66-2.67-2.87-.63-1.22-.94-2.57-.94-4.05s.32-2.78.96-3.96,1.51-2.12,2.63-2.78c1.11-.67,2.36-1,3.72-1,1.62,0,3.02.49,4.18,1.47Z"/>\n    <path class="cls-6" d="M403.62,397.4v-3.78h3.78v3.78h-3.78ZM403.62,408.5v-3.77h3.78v3.77h-3.78Z"/>\n    <path class="cls-6" d="M431.73,398.87v7.02h2.49v2.61h-5.07v-1.83c-1.42,1.39-2.99,2.08-4.73,2.08-.92,0-1.75-.21-2.51-.64-.76-.42-1.37-.99-1.83-1.71-.46-.71-.69-1.5-.69-2.37,0-.93.25-1.77.76-2.5.5-.73,1.19-1.3,2.05-1.69.86-.4,1.72-.59,2.59-.59,1.45,0,2.81.42,4.06,1.27v-1.6c0-1.16-.25-1.99-.74-2.49-.49-.5-1.3-.75-2.42-.75-.79,0-1.46.14-1.99.43-.53.29-.97.72-1.32,1.31l-2.8-.69c.63-1.18,1.49-2.06,2.56-2.64,1.08-.58,2.36-.87,3.84-.87,1.99,0,3.45.45,4.37,1.36s1.38,2.34,1.38,4.29ZM424.82,406.5c1.43,0,2.78-.6,4.04-1.8v-1.74c-1.27-.99-2.55-1.49-3.82-1.49-.77,0-1.44.24-2,.73-.56.49-.84,1.1-.84,1.83s.25,1.3.74,1.76c.49.47,1.12.7,1.9.7Z"/>\n    <path class="cls-6" d="M454.08,405.89v2.61h-5.59v-2.18c-1.49,1.62-3.27,2.44-5.34,2.44-1.44,0-2.7-.34-3.8-1.01-1.1-.67-1.95-1.59-2.56-2.75s-.91-2.44-.91-3.85.32-2.76.97-3.96c.65-1.21,1.54-2.17,2.68-2.88,1.14-.71,2.38-1.07,3.71-1.07.96,0,1.88.19,2.74.58s1.7,1,2.51,1.83v-5.89h-2.87v-2.58h5.78v18.73h2.69ZM443.71,406.15c.91,0,1.72-.24,2.45-.72.73-.48,1.3-1.12,1.71-1.93.42-.8.62-1.66.62-2.58s-.21-1.77-.62-2.53c-.42-.76-.99-1.37-1.73-1.81s-1.57-.67-2.49-.67-1.7.24-2.4.72c-.7.48-1.26,1.11-1.66,1.9-.41.79-.61,1.63-.61,2.53,0,.96.21,1.83.62,2.61.42.77.98,1.38,1.7,1.83.72.44,1.52.67,2.41.67Z"/>\n    <path class="cls-6" d="M473.75,405.89v2.61h-5.59v-2.18c-1.49,1.62-3.27,2.44-5.34,2.44-1.44,0-2.7-.34-3.8-1.01-1.1-.67-1.95-1.59-2.56-2.75s-.91-2.44-.91-3.85.32-2.76.97-3.96c.65-1.21,1.54-2.17,2.68-2.88,1.14-.71,2.38-1.07,3.71-1.07.96,0,1.88.19,2.74.58s1.7,1,2.51,1.83v-5.89h-2.87v-2.58h5.78v18.73h2.69ZM463.37,406.15c.91,0,1.72-.24,2.45-.72.73-.48,1.3-1.12,1.71-1.93.42-.8.62-1.66.62-2.58s-.21-1.77-.62-2.53c-.42-.76-.99-1.37-1.73-1.81s-1.57-.67-2.49-.67-1.7.24-2.4.72c-.7.48-1.26,1.11-1.66,1.9-.41.79-.61,1.63-.61,2.53,0,.96.21,1.83.62,2.61.42.77.98,1.38,1.7,1.83.72.44,1.52.67,2.41.67Z"/>\n    <path class="cls-6" d="M490.52,393.62v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M508.25,401.8h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM500.36,395.66c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M515.38,396.24l2.69,2.93,2.51-2.93h-1.52v-2.62h7.02v2.62h-2.46l-3.92,4.46,4.73,5.2h1.66v2.61h-7.02v-2.61h1.91l-2.96-3.37-2.92,3.37h1.91v2.61h-7.19v-2.61h2.17l4.47-5.03-4.23-4.63h-2.04v-2.62h7v2.62h-1.8Z"/>\n    <path class="cls-6" d="M535.1,393.62v2.62h-2.72v7.8c0,.81.09,1.34.26,1.58.17.24.47.36.9.36.52,0,1.04-.09,1.56-.27v2.65c-.91.26-1.64.4-2.19.4-1.23,0-2.11-.31-2.65-.93-.54-.62-.81-1.68-.81-3.18v-8.41h-1.94v-2.62h1.94v-2.25l2.93-2.68v4.93h2.72Z"/>\n    <path class="cls-6" d="M547.2,405.89v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M588,401.8h-12.48c.18,1.43.73,2.55,1.66,3.38.93.83,2.06,1.24,3.4,1.24.98,0,1.89-.2,2.73-.61.84-.41,1.54-1.03,2.11-1.87l2.58,1.16c-.81,1.27-1.88,2.22-3.19,2.87-1.32.65-2.75.97-4.3.97s-3.03-.33-4.28-1.01-2.22-1.6-2.91-2.8-1.04-2.55-1.04-4.05.34-2.84,1.03-4.04c.68-1.2,1.62-2.14,2.81-2.81,1.19-.67,2.5-1.01,3.94-1.01,1.57,0,2.93.35,4.1,1.04,1.17.69,2.08,1.69,2.75,2.97.67,1.29,1.03,2.81,1.09,4.57ZM580.11,395.66c-1.1,0-2.07.37-2.9,1.11-.83.74-1.36,1.72-1.6,2.94h9.32c-.27-1.22-.85-2.2-1.74-2.94-.89-.74-1.91-1.11-3.07-1.11Z"/>\n    <path class="cls-6" d="M592.44,405.89v-9.66h-2.51v-2.62h5.42v1.88c1.75-1.39,3.46-2.08,5.14-2.08s2.9.77,3.54,2.32c1.91-1.55,3.71-2.32,5.4-2.32,1.2,0,2.15.35,2.87,1.06.71.71,1.07,1.79,1.07,3.26v8.16h2.61v2.61h-5.51v-9.43c0-.65-.03-1.18-.1-1.59-.07-.41-.24-.75-.52-1.03-.28-.28-.72-.42-1.32-.42-.54,0-1.17.16-1.88.48-.72.32-1.47.8-2.27,1.44v7.94h2.52v2.61h-5.45v-9.8c0-.95-.14-1.64-.43-2.05-.29-.42-.76-.62-1.42-.62-1.08,0-2.49.64-4.23,1.93v7.94h2.62v2.61h-8.21v-2.61h2.68Z"/>\n    <path class="cls-6" d="M633.15,401.08c0,1.44-.34,2.77-1.03,3.96-.69,1.2-1.63,2.15-2.82,2.85s-2.51,1.05-3.95,1.05-2.84-.35-4.04-1.05c-1.2-.7-2.13-1.65-2.8-2.85s-1-2.52-1-3.96.33-2.86,1-4.05,1.59-2.12,2.78-2.8c1.19-.67,2.54-1.01,4.05-1.01s2.79.36,3.98,1.07c1.19.71,2.12,1.67,2.8,2.87s1.02,2.51,1.02,3.92ZM625.35,406.09c.87,0,1.67-.23,2.39-.68.73-.45,1.29-1.06,1.7-1.83.41-.76.61-1.6.61-2.51s-.2-1.71-.61-2.48c-.41-.76-.97-1.38-1.7-1.85-.73-.47-1.53-.7-2.42-.7s-1.67.23-2.39.69c-.73.46-1.3,1.07-1.71,1.85-.42.77-.62,1.6-.62,2.49s.21,1.72.62,2.49c.42.77.99,1.39,1.73,1.84s1.54.68,2.41.68Z"/>\n    <path class="cls-6" d="M35.88,430.21v-2.41h16.79v2.41h-16.79ZM35.88,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M56.85,430.21v-2.41h16.79v2.41h-16.79ZM56.85,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M77.82,430.21v-2.41h16.79v2.41h-16.79ZM77.82,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M98.79,430.21v-2.41h16.79v2.41h-16.79ZM98.79,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M119.76,430.21v-2.41h16.79v2.41h-16.79ZM119.76,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M140.73,430.21v-2.41h16.79v2.41h-16.79ZM140.73,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M161.71,430.21v-2.41h16.79v2.41h-16.79ZM161.71,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M182.68,430.21v-2.41h16.79v2.41h-16.79ZM182.68,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M203.65,430.21v-2.41h16.79v2.41h-16.79ZM203.65,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M224.62,430.21v-2.41h16.79v2.41h-16.79ZM224.62,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M245.59,430.21v-2.41h16.79v2.41h-16.79ZM245.59,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M266.56,430.21v-2.41h16.79v2.41h-16.79ZM266.56,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M287.53,430.21v-2.41h16.79v2.41h-16.79ZM287.53,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M308.5,430.21v-2.41h16.79v2.41h-16.79ZM308.5,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M329.48,430.21v-2.41h16.79v2.41h-16.79ZM329.48,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M350.45,430.21v-2.41h16.79v2.41h-16.79ZM350.45,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M371.42,430.21v-2.41h16.79v2.41h-16.79ZM371.42,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M392.39,430.21v-2.41h16.79v2.41h-16.79ZM392.39,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M413.36,430.21v-2.41h16.79v2.41h-16.79ZM413.36,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M434.33,430.21v-2.41h16.79v2.41h-16.79ZM434.33,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M455.3,430.21v-2.41h16.79v2.41h-16.79ZM455.3,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M476.27,430.21v-2.41h16.79v2.41h-16.79ZM476.27,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M497.25,430.21v-2.41h16.79v2.41h-16.79ZM497.25,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M518.22,430.21v-2.41h16.79v2.41h-16.79ZM518.22,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M539.19,430.21v-2.41h16.79v2.41h-16.79ZM539.19,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M560.16,430.21v-2.41h16.79v2.41h-16.79ZM560.16,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M581.13,430.21v-2.41h16.79v2.41h-16.79ZM581.13,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M602.1,430.21v-2.41h16.79v2.41h-16.79ZM602.1,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M623.07,430.21v-2.41h16.79v2.41h-16.79ZM623.07,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M644.04,430.21v-2.41h16.79v2.41h-16.79ZM644.04,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M665.01,430.21v-2.41h16.79v2.41h-16.79ZM665.01,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M685.99,430.21v-2.41h16.79v2.41h-16.79ZM685.99,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M706.96,430.21v-2.41h16.79v2.41h-16.79ZM706.96,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M727.93,430.21v-2.41h16.79v2.41h-16.79ZM727.93,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M748.9,430.21v-2.41h16.79v2.41h-16.79ZM748.9,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M769.87,430.21v-2.41h16.79v2.41h-16.79ZM769.87,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M790.84,430.21v-2.41h16.79v2.41h-16.79ZM790.84,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M811.81,430.21v-2.41h16.79v2.41h-16.79ZM811.81,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M832.78,430.21v-2.41h16.79v2.41h-16.79ZM832.78,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M853.76,430.21v-2.41h16.79v2.41h-16.79ZM853.76,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M874.73,430.21v-2.41h16.79v2.41h-16.79ZM874.73,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M895.7,430.21v-2.41h16.79v2.41h-16.79ZM895.7,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M916.67,430.21v-2.41h16.79v2.41h-16.79ZM916.67,437.41v-2.41h16.79v2.41h-16.79Z"/>\n    <path class="cls-6" d="M937.64,430.21v-2.41h16.79v2.41h-16.79ZM937.64,437.41v-2.41h16.79v2.41h-16.79Z"/>\n  </g>\n  <polyline class="cls-2" points="560.47 225.39 599.86 225.39 599.86 332.28 333.88 332.28 351.26 314.9"/>\n  <g>\n    <path class="cls-4" d="M664.87,139.15v10.01h-10.05c.02-5.5,4.53-10.01,10.05-10.01Z"/>\n    <path class="cls-3" d="M674.93,149.16v7.89c0,5.53-4.53,10.05-10.05,10.05s-10.05-4.52-10.05-10.05v-7.89h10.05v-10.01c2.76,0,5.28,1.13,7.1,2.96,1.82,1.81,2.94,4.31,2.96,7.05Z"/>\n    <line class="cls-3" x1="674.93" y1="149.16" x2="664.87" y2="149.16"/>\n    <line class="cls-5" x1="664.87" y1="149.35" x2="664.87" y2="149.16"/>\n  </g>\n  <g>\n    <path class="cls-4" d="M692.01,139.15v10.01h-10.05c.02-5.5,4.53-10.01,10.05-10.01Z"/>\n    <path class="cls-3" d="M702.07,149.16v7.89c0,5.53-4.53,10.05-10.05,10.05s-10.05-4.52-10.05-10.05v-7.89h10.05v-10.01c2.76,0,5.28,1.13,7.1,2.96,1.82,1.81,2.94,4.31,2.96,7.05Z"/>\n    <line class="cls-3" x1="702.07" y1="149.16" x2="692.01" y2="149.16"/>\n    <line class="cls-5" x1="692.01" y1="149.35" x2="692.01" y2="149.16"/>\n  </g>\n  <g>\n    <path class="cls-4" d="M633.69,176.69v10.01h-10.05c.02-5.5,4.53-10.01,10.05-10.01Z"/>\n    <path class="cls-3" d="M643.74,186.7v7.89c0,5.53-4.53,10.05-10.05,10.05s-10.05-4.52-10.05-10.05v-7.89h10.05v-10.01c2.76,0,5.28,1.13,7.1,2.96,1.82,1.81,2.94,4.31,2.96,7.05Z"/>\n    <line class="cls-3" x1="643.74" y1="186.7" x2="633.69" y2="186.7"/>\n    <line class="cls-5" x1="633.69" y1="186.88" x2="633.69" y2="186.7"/>\n  </g>\n  <g>\n    <path class="cls-4" d="M535.43,212.97v10.01h-10.05c.02-5.5,4.53-10.01,10.05-10.01Z"/>\n    <path class="cls-3" d="M545.48,222.98v7.89c0,5.53-4.53,10.05-10.05,10.05s-10.05-4.52-10.05-10.05v-7.89h10.05v-10.01c2.76,0,5.28,1.13,7.1,2.96,1.82,1.81,2.94,4.31,2.96,7.05Z"/>\n    <line class="cls-3" x1="545.48" y1="222.98" x2="535.43" y2="222.98"/>\n    <line class="cls-5" x1="535.43" y1="223.17" x2="535.43" y2="222.98"/>\n  </g>\n  <line class="cls-1" x1="563.48" y1="122.31" x2="627.53" y2="122.31"/>\n  <line class="cls-1" x1="563.48" y1="114.12" x2="627.53" y2="114.12"/>\n  <line class="cls-1" x1="639.46" y1="118.22" x2="623.8" y2="102.57"/>\n  <line class="cls-1" x1="623.8" y1="134.03" x2="639.46" y2="118.37"/>\n  <line class="cls-1" x1="662.18" y1="395.05" x2="707.84" y2="395.05"/>\n  <line class="cls-1" x1="708.76" y1="395.05" x2="696.64" y2="383.11"/>\n  <line class="cls-1" x1="696.82" y1="407.28" x2="708.76" y2="395.17"/>\n  <path class="cls-1" d="M647.88,377.46v33.24h33.24c0-18.36-14.88-33.24-33.24-33.24Z"/>\n</svg>';
  const helpQuestionSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15.9082 26.9297" width="100%" height="100%" style="display:block"><path fill="#221f20" d="M15.90820 7.66406Q15.90820 9.72070 14.98535 11.32031Q14.06250 12.91992 12.51562 13.80762Q10.96875 14.69531 9.17578 14.69531Q8.77148 14.69531 8.56055 14.66016L8.05078 19.79297L6.11719 19.79297L5.64258 11.37305Q6.50391 11.60156 7.59375 11.60156Q9.89648 11.60156 11.03027 10.35352Q12.16406 9.10547 12.16406 7.31250Q12.16406 5.29102 10.91602 4.19238Q9.66797 3.09375 7.91016 3.09375Q5.81836 3.09375 4.68457 4.29785Q3.55078 5.50195 3.55078 7.76953L3.55078 8.45508L0.03516 8.45508Q0.00000 8.31445 0.00000 7.45312Q0.00000 4.78125 1.16895 3.11133Q2.33789 1.44141 4.15723 0.72070Q5.97656 0.00000 7.83984 0.00000Q11.68945 0.00000 13.79883 2.05664Q15.90820 4.11328 15.90820 7.66406ZM4.74609 26.92969L4.74609 22.25391L9.38672 22.25391L9.38672 26.92969Z"/></svg>\n';
  let helpButton, helpPopup, helpReturnFocus;
  function setHelpOpen(open) {
    helpPopup.style.display = open ? "flex" : "none";
    helpButton.setAttribute("aria-expanded", String(open));
    if (open) {
      helpReturnFocus = document.activeElement;
      if (document.activeElement && document.activeElement.blur)
        document.activeElement.blur();
      helpPopup.querySelector("button").focus({ preventScroll: true });
    } else if (helpReturnFocus && helpReturnFocus.focus)
      helpReturnFocus.focus({ preventScroll: true });
  }
  function createHelpPopup() {
    helpButton = document.createElement("button");
    helpButton.innerHTML = helpQuestionSvg;
    helpButton.setAttribute("aria-label", "도움말 열기");
    helpButton.setAttribute("aria-expanded", "false");
    Object.assign(helpButton.style, {
      position: "fixed",
      border: "none",
      padding: "0",
      margin: "0",
      background: "transparent",
      cursor: "pointer",
      zIndex: "5",
      touchAction: "manipulation",
    });
    helpButton.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
    });
    helpButton.addEventListener("click", function () {
      setHelpOpen(true);
    });
    document.body.appendChild(helpButton);
    helpPopup = document.createElement("div");
    Object.assign(helpPopup.style, {
      position: "fixed",
      inset: "0",
      zIndex: "20",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.25)",
      padding: "3vw",
      boxSizing: "border-box",
    });
    let panel = document.createElement("div");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "사용 안내");
    Object.assign(panel.style, {
      position: "relative",
      width: "min(94vw,1000px)",
      maxHeight: "88dvh",
      overflowY: "auto",
      background: "white",
      padding: "40px 12px 12px",
      boxSizing: "border-box",
    });
    let close = document.createElement("button");
    close.textContent = "×";
    close.setAttribute("aria-label", "도움말 닫기");
    Object.assign(close.style, {
      position: "absolute",
      right: "10px",
      top: "4px",
      border: "none",
      background: "white",
      fontSize: "30px",
      lineHeight: "32px",
      cursor: "pointer",
    });
    close.addEventListener("click", function () {
      setHelpOpen(false);
    });
    let art = document.createElement("img");
    art.src =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(helpArtwork);
    art.alt =
      "조작 안내: 별 박스로 중요 메모, 오른쪽 스와이프로 전체보기, 더블 클릭으로 드로잉, 클릭으로 텍스트 메모";
    Object.assign(art.style, {
      display: "block",
      width: "100%",
      height: "auto",
    });
    panel.appendChild(close);
    panel.appendChild(art);
    helpPopup.appendChild(panel);
    document.body.appendChild(helpPopup);
    helpPopup.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
    });
    helpPopup.addEventListener("click", function (event) {
      if (event.target === helpPopup) setHelpOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && helpPopup.style.display !== "none")
        setHelpOpen(false);
    });
  }
  function positionHelpButton() {
    helpButton.style.display = mode === "circles" ? "none" : "block";
    let point = canvasToScreen({ x: width * 0.03, y: height * 0.02 * 1.25 });
    let rect = canvasElement.getBoundingClientRect(),
      unit = rect.width / width;
    let size = min(base * 0.04, 28) * unit;
    Object.assign(helpButton.style, {
      left: point.x + "px",
      top: point.y + "px",
      height: size + "px",
      width: (size * 15.9082) / 26.9297 + "px",
    });
  }

  // 3. 시작과 입력 연결
  function setup() {
    lockScreen();
    canvasElement = createCanvas(windowWidth, windowHeight).elt;
    Object.assign(canvasElement.style, {
      position: "fixed",
      left: "0",
      top: "0",
      display: "block",
      touchAction: "none",
    });
    angleMode(DEGREES);
    textFont("sans-serif");
    // 마우스를 사용하는 넓은 가로 화면에서만 원의 최대 크기를 조금 확대
    let laptopLayout =
      width >= 900 &&
      width > height &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: fine)").matches;
    sizeCaps.base = laptopLayout ? 600 : 520;
    sizeCaps.overviewDiameter = laptopLayout ? 720 : 640;
    base = min(width, height, sizeCaps.base);
    cx = width * 0.495; // 시각적 균형을 위해 화면 중앙에서 0.5% 왼쪽으로 보정
    cy = height / 2;
    r = base * 0.2;
    ui = {};
    for (let name in sizeRules) {
      let [ratio, limit = Infinity] = sizeRules[name];
      ui[name] = min(base * ratio, limit);
    }
    view = { x: cx, y: cy, scale: 1 };
    createNumberImages();
    createTodayLabel();
    createImportantBox();
    createImportantOverview();
    createHelpPopup();
    for (let [event, handler] of [
      ["pointerdown", pointerDown],
      ["pointermove", pointerMove],
      ["pointerup", pointerUp],
      ["pointercancel", pointerCancel],
    ])
      canvasElement.addEventListener(event, handler);
    canvasElement.addEventListener("dblclick", preventDefault);
    if (window.visualViewport) {
      for (let event of ["resize", "scroll"]) {
        window.visualViewport.addEventListener(event, positionVisibleInputs);
      }
    }
    window.addEventListener(
      "scroll",
      function () {
        if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
        positionVisibleInputs();
      },
      { passive: true },
    );
  }

  function lockScreen() {
    document.documentElement.style.overflow = "hidden";
    Object.assign(document.body.style, {
      margin: "0",
      overflow: "hidden",
      position: "fixed",
      inset: "0",
      overscrollBehavior: "none",
    });
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }
    viewport.content =
      "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no";
    document.addEventListener("gesturestart", preventDefault, {
      passive: false,
    });
  }

  function preventDefault(event) {
    event.preventDefault();
  }

  function pointerDown(event) {
    if (mode === "important") {
      if (importantTarget) toggleImportantBox();
      return;
    }
    if (mode === "moving") return;
    let point = { x: event.offsetX, y: event.offsetY };
    canvasElement.setPointerCapture(event.pointerId);
    if (mode === "main" || mode === "circles")
      startClick(event.pointerId, point);
    if (mode === "layers") startMemo(event.pointerId, point);
    if (mode === "drawing") startDrawing(event.pointerId, point);
  }

  function startClick(id, point) {
    if (gesture) return;
    let area =
      dist(point.x, point.y, cx, cy) <= r
        ? getArea(atan2(point.y - cy, point.x - cx))
        : null;
    let double =
      mode === "main" &&
      area !== null &&
      pendingClick &&
      pendingClick.area === area &&
      Date.now() - pendingClick.time <= doubleClickDelay &&
      pointDistance(point, pendingClick) < base * 0.08;
    if (double) {
      clearTimeout(clickTimer);
      pendingClick = null;
    }
    gesture = { id, ...point, area, dragged: false, double: !!double };
  }

  function startMemo(id, point) {
    if (!memoInputsShown || currentMemo) return;
    let local = localPoint(point.x, point.y);
    if (!insideLayer(local)) return moveView(false);
    currentMemo = {
      id,
      area: selectedArea,
      ax: local.x / r,
      ay: local.y / r,
      bx: local.x / r,
      by: local.y / r,
      text: "",
      input: null,
    };
    memos.push(currentMemo);
  }

  function startDrawing(id, point) {
    let local = drawingPoint(point.x, point.y);
    if (!fingers.size && !insideArea(local, selectedArea)) {
      mode = "main";
      activeNow = [0, 1, 2, 3];
      return;
    }
    fingers.set(id, point);
    erasing = fingers.size >= 2;
    if (erasing) eraseDrawing();
    else drawings[selectedArea].push([local]);
  }

  function pointerMove(event) {
    if (updateCircleDrag(event)) return;
    let point = { x: event.offsetX, y: event.offsetY };
    if (
      (mode === "main" || mode === "circles") &&
      gesture &&
      gesture.id === event.pointerId &&
      pointDistance(point, gesture) > base * 0.025
    )
      gesture.dragged = true;
    if (
      mode === "layers" &&
      currentMemo &&
      currentMemo.id === event.pointerId
    ) {
      updateMemoEnd(point);
    }
    if (mode !== "drawing" || !fingers.has(event.pointerId)) return;
    fingers.set(event.pointerId, point);
    if (erasing) {
      if (fingers.size >= 2) eraseDrawing();
    } else {
      let local = drawingPoint(point.x, point.y);
      let strokes = drawings[selectedArea];
      if (insideArea(local, selectedArea))
        strokes[strokes.length - 1].push(local);
    }
  }

  function pointerUp(event) {
    if (
      (mode === "main" || mode === "circles") &&
      gesture &&
      gesture.id === event.pointerId
    ) {
      return finishMainGesture(event);
    }
    if (
      mode === "layers" &&
      currentMemo &&
      currentMemo.id === event.pointerId
    ) {
      updateMemoEnd({ x: event.offsetX, y: event.offsetY });
      let length = dist(
        currentMemo.ax,
        currentMemo.ay,
        currentMemo.bx,
        currentMemo.by,
      );
      if (length * r * view.scale > base * 0.025) createMemoInput(currentMemo);
      else memos.pop();
      currentMemo = null;
    }
    fingers.delete(event.pointerId);
    if (!fingers.size) erasing = false;
  }

  function updateCircleDrag(event) {
    if (
      !gesture ||
      gesture.id !== event.pointerId ||
      (mode !== "main" && mode !== "circles")
    )
      return false;
    let dx = event.offsetX - gesture.x;
    let dy = event.offsetY - gesture.y;
    if (!gesture.circleDrag) {
      if (abs(dx) <= base * 0.025 || abs(dx) <= abs(dy)) return false;
      if ((mode === "main" && dx < 0) || (mode === "circles" && dx > 0))
        return false;
      gesture.circleOrigin = mode === "main" ? 0 : circleMotion.progress;
      gesture.circleDrag = true;
      clearTimeout(clickTimer);
      pendingClick = null;
      startCircleMotion(mode === "main", gesture.circleOrigin);
      circleMotion.running = false;
      circleMotion.dragging = true;
    }
    // 손가락 이동 거리로 매 프레임 펼침 정도를 계산
    circleMotion.progress = constrain(
      gesture.circleOrigin + dx / (base * swipeTravelRatio),
      0,
      1,
    );
    return true;
  }

  function finishMainGesture(event) {
    updateCircleDrag(event);
    if (gesture.circleDrag) {
      let progress = circleMotion.progress;
      gesture = null;
      startCircleMotion(progress >= 0.5, progress);
      return;
    }
    if (mode === "circles" || gesture.area === null) {
      gesture = null;
      return;
    }
    finishClick();
  }

  function finishClick() {
    let click = gesture;
    gesture = null;
    if (click.dragged) return;
    clearTimeout(clickTimer);
    if (click.double) {
      pendingClick = null;
      selectedArea = click.area;
      activeNow = [click.area];
      mode = "drawing";
    } else {
      pendingClick = {
        area: click.area,
        x: click.x,
        y: click.y,
        time: Date.now(),
      };
      clickTimer = setTimeout(function () {
        if (mode !== "main" || !pendingClick) return;
        selectedArea = pendingClick.area;
        pendingClick = null;
        moveView(true);
      }, doubleClickDelay);
    }
  }

  function updateMemoEnd(point) {
    let local = localPoint(point.x, point.y);
    currentMemo.bx = local.x / r;
    currentMemo.by = local.y / r;
  }

  function pointerCancel(event) {
    if (gesture && gesture.id === event.pointerId && gesture.circleDrag) {
      let progress = circleMotion.progress;
      startCircleMotion(progress >= 0.5, progress);
    }
    fingers.delete(event.pointerId);
    if (gesture && gesture.id === event.pointerId) gesture = null;
    if (currentMemo && currentMemo.id === event.pointerId) {
      memos.pop();
      currentMemo = null;
    }
    if (!fingers.size) erasing = false;
  }

  // 4. 화면과 인덱스 애니메이션
  function moveView(open) {
    hideInputs();
    memoInputsShown = titlesShown = false;
    lineRevealStart = null;
    let fromCenterScale = view.scale * currentLayerCenterScale();
    transition = {
      start: millis(),
      open,
      duration: open ? moveDuration.open : moveDuration.close,
      fromBlend: layerViewBlend,
      toBlend: open ? 1 : 0,
      fromCenterScale,
      from: { ...view },
      to: open ? dockView(selectedArea) : { x: cx, y: cy, scale: 1 },
    };
    transition.toCenterScale =
      transition.to.scale * (open ? layerCenterScale : 1);
    if (open) {
      indexBlend = 0;
      indexMotion = null;
      layerStart = transition.start;
      showLayerInputs();
      let indexStart = layerStart;
      startIndexMotion(1, indexMoveDuration, transition.to, indexStart);
    } else startIndexMotion(0, transition.duration);
    mode = "moving";
  }

  function isLayerView() {
    return mode === "layers" || (mode === "moving" && transition);
  }
  function currentLayerCenterScale() {
    if (transition) {
      let visibleScale = lerp(
        transition.fromCenterScale,
        transition.toCenterScale,
        easeOut(
          transition.progress == null
            ? animationTime(transition)
            : transition.progress,
        ),
      );
      return visibleScale / view.scale;
    }
    return lerp(1, layerCenterScale, layerViewBlend);
  }

  function dockView(area) {
    // 중심 원의 반대쪽 끝부터 호3 끝까지를 하나의 폭으로 계산
    let availableHeight = height * (1 - layerVerticalMarginRatio - 0.02);
    let availableWidth = width * (1 - layerSideMarginRatio - 0.02);
    let shapeExtent = r * (layerLayoutCenterScale + layerScales[3]);
    let scale = min(
      dockScale,
      availableHeight / shapeExtent,
      availableWidth / shapeExtent,
    );
    let centerRadius = r * scale * layerCenterScale;
    let dock = {
      x: isRight(area)
        ? width * layerSideMarginRatio + centerRadius
        : width * (1 - layerSideMarginRatio) - centerRadius,
      // 아래 영역은 위로 이동해 위 여백 고정, 위 영역은 아래로 이동해 아래 여백 고정
      y: isBelow(area)
        ? height * layerVerticalMarginRatio + centerRadius
        : height * (1 - layerVerticalMarginRatio) - centerRadius,
      scale,
    };
    // 아이폰은 가로·세로 회전 모두 기존 배치를 유지. 큰 화면만 그룹 전체를 중앙 쪽으로 보정
    if (min(width, height) >= 600) {
      let outerRadius = r * scale * layerScales[3];
      let offset = (outerRadius - centerRadius) / 2;
      let centeredX = width / 2 - (isRight(area) ? 1 : -1) * offset;
      let centeredY = height / 2 - (isBelow(area) ? 1 : -1) * offset;
      dock.x = lerp(dock.x, centeredX, 0.3);
      dock.y = lerp(dock.y, centeredY, 0.3);
    }
    return dock;
  }

  function updateAnimations() {
    if (indexMotion) {
      let t = animationTime(indexMotion);
      indexMotion.progress = indexMotion.to === 1 ? smoothStep(t) : easeOut(t);
      indexBlend = lerp(indexMotion.from, indexMotion.to, indexMotion.progress);
      if (t === 1) {
        indexBlend = indexMotion.to;
        indexMotion = null;
      }
    }
    if (transition) {
      let t = animationTime(transition);
      transition.progress = t;
      view = mix(transition.from, transition.to, easeOut(t));
      layerViewBlend = lerp(
        transition.fromBlend,
        transition.toBlend,
        easeOut(t),
      );
      if (t === 1) {
        mode = transition.open ? "layers" : "main";
        transition = null;
      }
    }
  }

  function startIndexMotion(
    target,
    duration,
    targetView = view,
    startTime = millis(),
  ) {
    let paths = new Map();
    for (let memo of memos) {
      if (memo.area !== selectedArea) continue;
      paths.set(memo, {
        from: memoAnchor(memo),
        to: target
          ? relativeMemoAnchor(memo, targetView)
          : cornerMemoAnchor(memo),
        textFrom: memoTextPoint(memo),
        textTo: target
          ? layerMemoTextPoint(memo, targetView)
          : cornerMemoTextPoint(memo),
      });
    }
    indexMotion = {
      start: startTime,
      duration,
      from: indexBlend,
      to: target,
      progress: 0,
      paths,
    };
    if (target) lineRevealStart = startTime + duration;
  }

  function animationTime(animation) {
    return constrain((millis() - animation.start) / animation.duration, 0, 1);
  }
  function easeOut(t) {
    return 1 - pow(1 - t, 3);
  }
  function smoothStep(t) {
    return t * t * (3 - 2 * t);
  }
  function mix(from, to, progress) {
    let result = {};
    for (let key in from) result[key] = lerp(from[key], to[key], progress);
    return result;
  }
  function layersReady() {
    return millis() - layerStart >= layerDurations[2];
  }
  function layersVisible() {
    return (
      millis() >= layerStart &&
      (mode === "layers" ||
        (mode === "moving" && transition && transition.open))
    );
  }
  function lineRevealProgress() {
    if (mode !== "layers" || lineRevealStart === null) return 0;
    if (
      !memos.some((memo) => memo.area === selectedArea && memo.input !== null)
    )
      return 1;
    return constrain((millis() - lineRevealStart) / lineDrawDuration, 0, 1);
  }

  // 스와이프 화면: 원의 크기 비율을 유지하며 전체를 화면 안에 배치
  function startCircleMotion(open, from = open ? 0 : 1) {
    if (circleMotion && circleMotion.running) return;
    hideInputs();
    let outerDiameter = r * 2 * overviewScales[3];
    let usableSize = min(
      min(width, height) * (1 - circleMarginRatio * 2),
      sizeCaps.overviewDiameter,
    );
    circleMotion = {
      start: millis(),
      open,
      running: true,
      dragging: false,
      from,
      progress: from,
      duration: max(1, circleGrowDuration * abs((open ? 1 : 0) - from)),
      targetScale: min(1, usableSize / outerDiameter),
    };
    mode = "circles";
  }

  function drawCircleView() {
    if (circleMotion.running) {
      let t = constrain(
        (millis() - circleMotion.start) / circleMotion.duration,
        0,
        1,
      );
      circleMotion.progress = lerp(
        circleMotion.from,
        circleMotion.open ? 1 : 0,
        smoothStep(t),
      );
      if (t === 1) circleMotion.running = false;
    }
    let progress = circleMotion.progress;
    let shrink = smoothStep(progress);
    let centerScale = lerp(1, circleMotion.targetScale, shrink);

    push();
    translate(cx, cy);
    scale(centerScale);
    applyStrokeWeight();
    if (progress > 0) {
      let outer =
        (r * lerp(1, circleMotion.targetScale * overviewScales[3], shrink)) /
        centerScale;
      drawReferenceRays(r, outer);
    }
    // 큰 원부터 그려 중심 원의 뒤에 놓기
    for (let i = 2; i >= 0; i--) {
      if (progress <= 0) continue;
      // 화면에서 보이는 반지름을 보간해 펼쳐지는 도중에도 화면 밖으로 넘치지 않게 계산
      let size =
        lerp(
          1,
          circleMotion.targetScale * overviewScales[i + 1],
          smoothStep(progress),
        ) / centerScale;
      for (let area = 0; area < 4; area++) drawColoredArc(area, size, i + 1);
    }
    for (let area of activeNow) {
      drawSector(area);
      drawStrokes(area);
    }
    drawCenterDot();
    pop();

    drawCircleIndexes(shrink);

    if (
      !circleMotion.running &&
      !circleMotion.dragging &&
      circleMotion.progress === 0
    ) {
      mode = "main";
      circleMotion = null;
    }
  }

  // 동심원 화면에서는 네 영역의 저장 위치를 중심 원 크기에 맞춰 복원
  function circleMemoAnchor(memo) {
    let distance = dist(0, 0, memo.ax, memo.ay);
    let mappedDistance = overviewDistance(distance);
    let unit =
      r *
      circleMotion.targetScale *
      (distance > 0 ? mappedDistance / distance : 1);
    return { x: cx + memo.ax * unit, y: cy + memo.ay * unit };
  }

  // 저장한 점의 호 사이 상대 위치를 유지하며 전체 보기의 간격으로 변환
  function overviewDistance(distance) {
    if (distance <= layerScales[0]) return distance / layerScales[0];
    let band = 1;
    while (band < layerScales.length - 1 && distance > layerScales[band])
      band++;
    let progress =
      (distance - layerScales[band - 1]) /
      (layerScales[band] - layerScales[band - 1]);
    return lerp(overviewScales[band - 1], overviewScales[band], progress);
  }

  function drawCircleIndexes(progress) {
    push();
    applyStrokeWeight();
    for (let memo of memos) {
      let from = cornerMemoAnchor(memo);
      let to = circleMemoAnchor(memo);
      let anchor = mix(from, to, progress);
      drawMemoIndex(memo, anchor);

      // 메인에서의 원과 글자 사이 간격·맞춤을 유지한 채 함께 이동
      if (memo.text) {
        let label = cornerMemoTextPoint(memo);
        let textTarget = {
          x: to.x + label.x - from.x,
          y: to.y + label.y - from.y,
        };
        let position = mix({ x: label.x, y: label.y }, textTarget, progress);
        fill(0);
        noStroke();
        textSize(ui.previewFont);
        textAlign(LEFT, CENTER);
        text(previewText(memo), position.x, position.y);
      }
    }
    pop();
  }

  // 5. 매 프레임 그리는 내용
  function draw() {
    drawScene();
    positionNumberImages();
    positionTodayLabel();
    positionImportantBox();
    positionImportantOverview();
    positionHelpButton();
  }

  function drawScene() {
    updateAnimations();
    updateImportantBox();
    updateFieldVisibility();
    if (titlesShown) positionVisibleInputs();
    background(255);
    if (isLayerView()) drawNotebookLines();
    noFill();
    stroke(0);
    if (mode === "circles") {
      drawCircleView();
      return;
    }
    push();
    if (mode === "drawing") {
      let middle = selectedArea * 90 + 45;
      translate(cx, cy);
      scale(zoom);
      translate((-cos(middle) * r) / 2, (-sin(middle) * r) / 2);
    } else {
      translate(view.x, view.y);
      scale(view.scale);
    }
    if (mode === "drawing") drawDrawingBoundaries();
    push();
    if (mode !== "drawing") scale(currentLayerCenterScale());
    for (let area of activeNow) {
      drawSector(area);
      drawStrokes(area);
    }
    drawCenterDot();
    pop();
    if (layersVisible()) drawLayerGrid();
    pop();
    if (mode !== "drawing") drawMemos();
  }

  // 코드에 포함한 SVG를 직접 표시해 경로 오류 없이 벡터 선명도 유지
  function createNumberImages() {
    numberImages = numberLayout.map(function (item) {
      let image = document.createElement("div");
      image.innerHTML = numberVectors[item.digit - 1].svg;
      image.setAttribute("role", "img");
      image.setAttribute("aria-label", String(item.digit));
      Object.assign(image.style, {
        position: "fixed",
        display: "none",
        pointerEvents: "none",
        userSelect: "none",
        margin: "0",
        padding: "0",
        border: "0",
        width: "auto",
        zIndex: "1",
        transformOrigin: "0 0",
        willChange: "transform",
      });
      document.body.appendChild(image);
      return image;
    });
  }

  function positionNumberImages() {
    let sourceView = view;
    if (mode === "circles") {
      sourceView = {
        x: cx,
        y: cy,
        scale: lerp(
          1,
          circleMotion.targetScale,
          smoothStep(circleMotion.progress),
        ),
      };
    }
    for (let i = 0; i < numberLayout.length; i++) {
      let item = numberLayout[i];
      let image = numberImages[i];
      if (mode === "drawing" && item.area !== selectedArea) {
        image.style.display = "none";
        continue;
      }
      // 호레이어 모드에서는 숫자의 크기는 유지하고 위치만 중심 쪽으로 이동
      let numberInset =
        mode === "drawing" || mode === "circles"
          ? 1
          : lerp(1, 0.92, layerViewBlend);
      let local = {
        x: item.xRatio * r * numberInset,
        y: item.yRatio * r * numberInset,
      };
      let scale = sourceView.scale;
      let point;
      if (mode === "drawing") {
        let middle = selectedArea * 90 + 45;
        scale = zoom;
        point = {
          x: cx + (local.x - (cos(middle) * r) / 2) * scale,
          y: cy + (local.y - (sin(middle) * r) / 2) * scale,
        };
      } else {
        if (mode !== "circles") scale *= currentLayerCenterScale();
        point = {
          x: sourceView.x + local.x * scale,
          y: sourceView.y + local.y * scale,
        };
      }
      let screen = canvasToScreen(point);
      let rect = canvasElement.getBoundingClientRect();
      Object.assign(image.style, {
        display: "block",
        left: "0px",
        top: "0px",
        height: (r * item.heightRatio * rect.height) / height + "px",
        width:
          ((r * item.heightRatio * rect.height) / height) *
            numberVectors[i].ratio +
          "px",
        transform:
          "translate3d(" +
          screen.x +
          "px," +
          screen.y +
          "px,0) rotate(" +
          item.rotation +
          "deg) scale(" +
          scale +
          ") translate(-50%,-50%)",
      });
    }
  }

  // 화면 확대·축소와 기기 픽셀 밀도를 보정해 표시 두께를 유지
  function applyStrokeWeight() {
    let transform = drawingContext.getTransform();
    let canvasScale = Math.hypot(transform.a, transform.b) / pixelDensity();
    let multiplier = mode === "circles" ? overviewOverallStrokeMultiplier : 1;
    strokeWeight(
      (min(r * 0.015, maxStrokePixels.drawing) *
        multiplier *
        strokeSizeMultiplier) /
        canvasScale,
    );
  }

  function applyDesignWeight(gray = false, layerMultiplier = 1) {
    let transform = drawingContext.getTransform();
    let canvasScale = Math.hypot(transform.a, transform.b) / pixelDensity();
    let desired = base * outlineRatio * (gray ? grayToOutlineRatio : 1);
    let normal =
      min(desired, gray ? maxStrokePixels.gray : maxStrokePixels.outline) *
      layerMultiplier *
      strokeSizeMultiplier *
      (gray ? grayStrokeMultiplier : 1);
    let weight;
    if (mode === "circles") {
      weight = normal * overviewOverallStrokeMultiplier;
    } else if (mode === "drawing") {
      weight = normal;
    } else if (gray) {
      weight =
        normal *
        lerp(
          1,
          layerGrayMultiplier * layerOverallStrokeMultiplier,
          layerViewBlend,
        );
    } else {
      // 메인·호레이어·전환 중 윤곽선은 같은 화면 두께를 사용
      weight = min(base * mainPhotoStrokeRatio, maxStrokePixels.outline);
    }
    strokeWeight(weight / canvasScale);
  }

  function drawColoredArc(area, size, layer) {
    noFill();
    // 전체보기 3번 영역은 변경 전 파랑 배색을 사용
    let overviewBlue = ["#4755A5", "#4755A5", "#4755A5", "#151446"];
    stroke(
      mode === "circles" && area === 0
        ? overviewBlue[layer]
        : ringColors[area][layer],
    );
    let multipliers =
      mode === "circles" ? overviewStrokeMultipliers : layerStrokeMultipliers;
    let layerAdjustment = isLayerView() && layer > 0 ? 0.9 : 1;
    applyDesignWeight(
      false,
      multipliers[layer] * layerAdjustment * (mode === "circles" ? 1.1 : 1),
    );
    arc(0, 0, r * 2 * size, r * 2 * size, area * 90, (area + 1) * 90);
  }

  // 호1 색의 축 두 개와 호 세 개로 채움 없는 격자를 표시
  function drawLayerGrid() {
    push();
    noFill();
    stroke(ringColors[selectedArea][1]);
    applyDesignWeight(false);
    let start = selectedArea * 90;
    let end = (selectedArea + 1) * 90;
    let outerRadius = r * layerCenterScale;
    for (let band = 0; band < 3; band++) {
      let progress = smoothStep(
        constrain((millis() - layerStart) / layerDurations[band], 0, 1),
      );
      if (progress <= 0) continue;
      let radius = r * lerp(layerCenterScale, layerScales[band + 1], progress);
      arc(0, 0, radius * 2, radius * 2, start, end);
      outerRadius = max(outerRadius, radius);
    }
    // 선택한 영역의 수평축과 수직축만 바깥 호까지 연결
    for (let angle of [start, end]) {
      let innerRadius = r * currentLayerCenterScale();
      line(
        cos(angle) * innerRadius,
        sin(angle) * innerRadius,
        cos(angle) * outerRadius,
        sin(angle) * outerRadius,
      );
    }
    pop();
  }

  function drawReferenceRays(inner, outer, area = null) {
    if (outer <= inner) return;
    stroke(grayLineColor);
    applyDesignWeight(true);
    let start = area === null ? 0 : area * 90;
    let end = area === null ? 330 : (area + 1) * 90;
    for (let angle = start; angle <= end; angle += 30) {
      line(
        cos(angle) * inner,
        sin(angle) * inner,
        cos(angle) * outer,
        sin(angle) * outer,
      );
    }
    stroke(0);
  }

  // 드로잉 화면의 두 반지름 경계. 드로잉 좌표와 동일한 변환 사용
  function drawDrawingBoundaries() {
    stroke(grayLineColor);
    applyDesignWeight(false, grayStrokeMultiplier);
    for (let angle of [selectedArea * 90, (selectedArea + 1) * 90]) {
      line(0, 0, cos(angle) * r, sin(angle) * r);
    }
    stroke(0);
  }

  function drawCenterDot() {
    noStroke();
    fill(0, 255 * (1 - smoothStep(importantProgress)));
    let overviewSize =
      mode === "circles"
        ? lerp(1, 1.3 * 1.3, smoothStep(circleMotion.progress))
        : 1;
    circle(0, 0, r * centerDotDiameterRatio * overviewSize);
    noFill();
    stroke(0);
  }

  function drawSector(area, size = 1, layer = 0) {
    if (layer > 0) {
      drawReferenceRays(r * layerCenterScale, r * size, area);
      drawColoredArc(area, size, layer);
      return;
    }
    // 원본처럼 30도 호와 30도 여백을 번갈아 배치. 숫자는 그리지 않음
    stroke(ringColors[area][0]);
    let centerWeight =
      mode === "circles" ? 1.15 * 0.9 * 1.3 : mode === "drawing" ? 1.3 : 1;
    applyDesignWeight(false, centerWeight);
    let previousCap = drawingContext.lineCap;
    if (mode === "main") drawingContext.lineCap = "butt";
    for (let angle = 0; angle < 360; angle += 60) {
      let start = max(angle, area * 90);
      let end = min(angle + 30, (area + 1) * 90);
      if (start < end) arc(0, 0, r * 2, r * 2, start, end);
    }
    drawingContext.lineCap = previousCap;
  }
  function drawStrokes(area) {
    stroke(0);
    applyStrokeWeight();
    for (let points of drawings[area]) {
      point(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
      }
    }
  }
  function drawMemos() {
    let reveal = lineRevealProgress();
    let opening = mode === "moving" && transition && transition.open;
    let focusSelected = opening || mode === "layers";
    push();
    stroke(0);
    applyStrokeWeight();
    for (let memo of memos) {
      if (focusSelected && memo.area !== selectedArea) continue;
      let anchor = memoAnchor(memo);
      if (mode === "layers" && memo.area === selectedArea) {
        let progress = memo === currentMemo ? 1 : reveal;
        if (progress > 0) {
          let end = mix(anchor, memoEnd(memo), progress);
          drawMemoConnector(memo, anchor, end);
        }
      }
      drawMemoIndex(memo, anchor);
      stroke(0);
      let inputVisible =
        mode === "layers" &&
        memoInputsShown &&
        memo.input &&
        memo.input.elt.style.display !== "none";
      let hideEnteringPreview = focusSelected && !memoInputsShown;
      if (!inputVisible && !hideEnteringPreview && memo.text) {
        let point = memoTextPoint(memo);
        fill(0);
        noStroke();
        textSize(point.font);
        textAlign(LEFT, CENTER);
        text(previewText(memo), point.x, point.y);
        stroke(0);
      }
    }
    pop();
  }

  // 화면에서 보이는 중심 점과 인덱스 지름을 일치시킴
  function visibleIndexDiameter() {
    let scale =
      mode === "circles"
        ? lerp(1, circleMotion.targetScale, smoothStep(circleMotion.progress))
        : view.scale;
    // 호레이어를 열고 닫는 동안 크기도 부드럽게 연결
    let layerSize =
      mode === "circles"
        ? lerp(1.5, 1.3 * 1.3 * 1.2 * 1.1, smoothStep(circleMotion.progress))
        : lerp(1.5, 1.3 * 1.3, indexBlend);
    return min(
      r * centerDotDiameterRatio * scale * layerSize * indexSizeMultiplier,
      sizeCaps.indexDiameter,
    );
  }
  // 모든 화면에서 인덱스는 검정색으로 표시
  function memoIndexColor(memo) {
    return "#000000";
  }

  // 호레이어 배경에만 줄노트 형태의 가로줄을 표시
  function drawNotebookLines() {
    push();
    stroke(grayLineColor);
    strokeWeight(min(base * 0.001, 0.7) * layerViewBlend);
    let spacing = min(base * 0.06, 36) * 0.95;
    let offset = ((view.y % spacing) + spacing) % spacing;
    for (let y = offset; y <= height; y += spacing) line(0, y, width, y);
    pop();
  }

  function drawMemoIndex(memo, anchor) {
    noStroke();
    fill(memoIndexColor(memo));
    circle(anchor.x, anchor.y, visibleIndexDiameter());
  }
  function drawMemoConnector(memo, anchor, end) {
    let length = pointDistance(anchor, end);
    let gap = visibleIndexDiameter() / 2 + base * memoIndexGapRatio;
    if (length <= gap) return;
    let start = mix(anchor, end, gap / length);
    let transform = drawingContext.getTransform();
    let canvasScale = Math.hypot(transform.a, transform.b) / pixelDensity();
    stroke(0);
    let style = dashStyle();
    strokeWeight(style.weight / canvasScale);
    let previousCap = drawingContext.lineCap;
    drawingContext.lineCap = "butt";
    drawingContext.setLineDash([
      style.length / canvasScale,
      style.gap / canvasScale,
    ]);
    line(start.x, start.y, end.x, end.y);
    drawingContext.setLineDash([]);
    drawingContext.lineCap = previousCap;
    stroke(0);
  }

  // 6. 상대 좌표와 인덱스 정렬 위치
  function memoAnchor(memo) {
    let path = indexMotion && indexMotion.paths.get(memo);
    if (path) return mix(path.from, path.to, indexMotion.progress);
    let aligned = cornerMemoAnchor(memo);
    if (memo.area !== selectedArea || indexBlend === 0) return aligned;
    return mix(aligned, relativeMemoAnchor(memo), indexBlend);
  }
  function memoTextPoint(memo) {
    let path = indexMotion && indexMotion.paths.get(memo);
    if (path) return mix(path.textFrom, path.textTo, indexMotion.progress);
    return memo.area === selectedArea && indexBlend === 1 && mode !== "main"
      ? layerMemoTextPoint(memo)
      : cornerMemoTextPoint(memo);
  }
  // Today·물음표와 인덱스 원의 왼쪽 시작선을 일치
  function leftIndexColumn() {
    let diameter = min(
      r * centerDotDiameterRatio * 1.5 * indexSizeMultiplier,
      sizeCaps.indexDiameter,
    );
    return width * 0.03 + diameter / 2;
  }
  function cornerMemoAnchor(memo) {
    let order = memos.filter((item) => item.area === memo.area).indexOf(memo);
    let margin = base * 0.07;
    // 왼쪽 위 목록은 물음표 아래 여백부터 시작
    let upperStart =
      memo.area === 2
        ? height * 0.025 +
          min(base * 0.04, 28) +
          base * 0.025 +
          sizeCaps.indexDiameter / 2
        : margin;
    return {
      x: isRight(memo.area) ? width - margin : leftIndexColumn(),
      y: isBelow(memo.area)
        ? height - margin - order * ui.indexRowHeight
        : upperStart + order * ui.indexRowHeight,
    };
  }
  function relativeMemoAnchor(memo, sourceView = view) {
    let targetScale = dockView(selectedArea).scale;
    let progress =
      Math.abs(1 - targetScale) < 1e-8
        ? 1
        : constrain((1 - sourceView.scale) / (1 - targetScale), 0, 1);
    let spread = lerp(0.5, 1, progress);
    let distance = dist(0, 0, memo.ax, memo.ay);
    let radius = max(
      (1 + max(0, distance - 1) * spread) * r * sourceView.scale,
      r * sourceView.scale * layerCenterScale + ui.indexDiameter / 2,
    );
    let direction = atan2(memo.ay, memo.ax);
    return {
      x: sourceView.x + cos(direction) * radius,
      y: sourceView.y + sin(direction) * radius,
    };
  }
  function cornerMemoTextPoint(memo) {
    let anchor = cornerMemoAnchor(memo);
    let label = anchor.x + (isRight(memo.area) ? -1 : 1) * ui.indexLabelGap;
    return {
      x: isRight(memo.area)
        ? label - measureMemoText(previewText(memo), ui.previewFont)
        : label,
      y: anchor.y,
      font: ui.previewFont,
    };
  }
  function layerMemoTextPoint(memo, sourceView = view) {
    let field = memoFieldLayout(memo, sourceView);
    let contentWidth = max(0, field.width - ui.padX * 2);
    let firstLine = "";
    for (let letter of Array.from((memo.text || "").split("\n")[0])) {
      if (
        firstLine &&
        measureMemoText(firstLine + letter, ui.memoFont) > contentWidth
      )
        break;
      firstLine += letter;
    }
    let lineWidth = measureMemoText(firstLine, ui.memoFont);
    let x =
      field.x + ui.padX + (field.left ? max(0, contentWidth - lineWidth) : 0);
    let rect = canvasElement.getBoundingClientRect();
    return {
      x: (x - rect.left) / (rect.width / width),
      y: memoEnd(memo, sourceView).y,
      font: ui.memoFont / (rect.width / width),
    };
  }
  function memoEnd(memo, sourceView = view) {
    return {
      x: sourceView.x + memo.bx * r * sourceView.scale,
      y: sourceView.y + memo.by * r * sourceView.scale,
    };
  }
  function localPoint(x, y) {
    return { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
  }
  function drawingPoint(x, y) {
    let middle = selectedArea * 90 + 45;
    return {
      x: (x - cx) / zoom + (cos(middle) * r) / 2,
      y: (y - cy) / zoom + (sin(middle) * r) / 2,
    };
  }
  function canvasToScreen(point) {
    let rect = canvasElement.getBoundingClientRect();
    return {
      x: rect.left + (point.x * rect.width) / width,
      y: rect.top + (point.y * rect.height) / height,
    };
  }
  function getArea(angle) {
    return floor((((angle % 360) + 360) % 360) / 90);
  }
  function isRight(area) {
    return area === 0 || area === 3;
  }
  function isBelow(area) {
    return area === 0 || area === 1;
  }
  function pointDistance(a, b) {
    return dist(a.x, a.y, b.x, b.y);
  }
  function insideArea(point, area) {
    return (
      dist(0, 0, point.x, point.y) <= r &&
      getArea(atan2(point.y, point.x)) === area
    );
  }
  function insideLayer(point) {
    let distance = dist(0, 0, point.x, point.y);
    return (
      distance > r * layerCenterScale &&
      distance <= r * layerScales[3] &&
      getArea(atan2(point.y, point.x)) === selectedArea
    );
  }
  function previewText(memo) {
    // 원문 줄바꿈은 유지하되 인덱스 미리보기에서는 공백으로 바꿔 한 줄만 표시
    let singleLine = String(memo.text || "").replace(
      /[\r\n\u2028\u2029]+/g,
      " ",
    );
    return Array.from(singleLine).slice(0, 5).join("");
  }
  function measureMemoText(value, font) {
    push();
    textFont("sans-serif");
    textSize(font);
    let size = textWidth(value);
    pop();
    return size;
  }

  // 7. 메모·제목 입력창: 공통 모양과 줄바꿈 처리를 한곳에서 관리
  function makeField(placeholder, title = false) {
    let input = createElement("textarea");
    for (let [name, value] of [
      ["placeholder", placeholder],
      ["rows", "1"],
      ["wrap", "soft"],
    ]) {
      input.attribute(name, value);
    }
    let lineHeight = title ? ui.titleLine : ui.memoLine;
    let padding = title ? "0" : ui.padY + "px " + ui.padX + "px";
    Object.assign(input.elt.style, {
      position: "fixed",
      boxSizing: "border-box",
      border: "none",
      outline: "none",
      boxShadow: "none",
      background: "transparent",
      borderRadius: "0",
      fontFamily: "sans-serif",
      fontSize: (title ? ui.titleFont : ui.memoFont) + "px",
      lineHeight: lineHeight + "px",
      height: lineHeight + (title ? 0 : ui.padY * 2) + "px",
      padding,
      margin: "0",
      transform: "none",
      touchAction: "manipulation",
      resize: "none",
      overflow: "hidden",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
    });
    if (title) {
      input.style("color", "#888");
      input.style("min-height", ui.titleLine + "px");
      input.style("text-align", "center");
    }
    return input;
  }
  function fitFieldHeight(input, minimum) {
    input.style("height", "auto");
    input.style("height", max(minimum, input.elt.scrollHeight) + "px");
  }
  function createMemoInput(memo) {
    memo.input = makeField("메모");
    memo.input.style("text-align", isRight(memo.area) ? "left" : "right");
    memo.input.input(function () {
      memo.text = memo.input.value();
      placeMemoInput(memo);
    });
    placeMemoInput(memo);
  }
  function memoFieldLayout(memo, sourceView = view) {
    let content =
      Math.max(
        ...(memo.text || "메모")
          .split("\n")
          .map((line) => measureMemoText(line, ui.memoFont)),
      ) +
      ui.padX * 2;
    let end = canvasToScreen(memoEnd(memo, sourceView));
    let left = !isRight(memo.area);
    let screenWidth = document.documentElement.clientWidth || width;
    let available = max(
      ui.minField,
      left ? end.x - ui.edge : screenWidth - end.x - ui.edge,
    );
    let fieldWidth = min(max(ui.memoWidth, content), available);
    return {
      x: end.x - (left ? fieldWidth : 0),
      y: end.y - ui.memoLine / 2 - ui.padY,
      width: fieldWidth,
      left,
    };
  }
  function placeMemoInput(memo) {
    let field = memoFieldLayout(memo);
    memo.input.size(field.width);
    fitFieldHeight(memo.input, ui.memoLine + ui.padY * 2);
    memo.input.style("left", field.x + "px");
    memo.input.style("top", field.y + "px");
  }
  function showLayerInputs() {
    for (let i = 0; i < 3; i++) {
      if (!titleInputs[selectedArea][i]) {
        let area = selectedArea;
        let input = makeField("title" + (i + 1), true);
        input.attribute("name", "title" + (i + 1));
        input.input(function () {
          titleValues[area][i] = input.value();
          placeTitleInput(i);
        });
        titleInputs[area][i] = input;
        titleCurves[area][i] = createCurvedTitle(area, i, input);
      }
      titleInputs[selectedArea][i].hide();
    }
  }
  // 입력은 실제 textarea가 맡고, 보이는 글자는 SVG 곡선을 따라 실시간 표시
  function createCurvedTitle(area, index, input) {
    let wrapper = document.createElement("div");
    let id = "memo-title-curve-" + area + "-" + index;
    wrapper.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
      '<defs><path id="' +
      id +
      '"/></defs>' +
      '<text font-family="sans-serif" text-anchor="start" style="pointer-events:visiblePainted;cursor:text">' +
      '<textPath href="#' +
      id +
      '" startOffset="0%"></textPath></text></svg>';
    Object.assign(wrapper.style, {
      position: "fixed",
      inset: "0",
      display: "none",
      pointerEvents: "none",
      zIndex: "2",
    });
    document.body.appendChild(wrapper);
    let path = wrapper.querySelector("defs path");
    let text = wrapper.querySelector("text");
    let textPath = wrapper.querySelector("textPath");
    function beginEdit(event) {
      event.preventDefault();
      event.stopPropagation();
      input.elt.focus({ preventScroll: true });
      let end = input.value().length;
      input.elt.setSelectionRange(end, end);
      placeTitleInput(index);
    }
    text.addEventListener("pointerdown", beginEdit);
    input.attribute("aria-label", "title" + (index + 1));
    Object.assign(input.elt.style, {
      opacity: "0",
      pointerEvents: "none",
      fontSize: "16px",
      caretColor: "transparent",
    });
    for (let name of ["focus", "blur", "keyup", "select", "compositionend"]) {
      input.elt.addEventListener(name, function () {
        if (selectedArea === area && titlesShown) placeTitleInput(index);
      });
    }
    return { wrapper, path, text, textPath };
  }

  function placeTitleInput(i) {
    let input = titleInputs[selectedArea][i];
    let curve = titleCurves[selectedArea][i];
    if (!curve) return;
    let inner = (i === 0 ? layerCenterScale : layerScales[i]) * r * view.scale;
    let outer = layerScales[i + 1] * r * view.scale;
    let canvasRect = canvasElement.getBoundingClientRect();
    let screenScale = canvasRect.width / width;
    let radius = ((inner + outer) / 2) * screenScale;
    let center = canvasToScreen({ x: view.x, y: view.y });
    // 숫자가 있는 쪽의 끝에서 시작해 시계 방향으로 입력
    let start = selectedArea * 90 + 4;
    let end = (selectedArea + 1) * 90 - 4;
    function point(angle) {
      let radian = (angle * Math.PI) / 180;
      return {
        x: center.x + Math.cos(radian) * radius,
        y: center.y + Math.sin(radian) * radius,
      };
    }
    let from = point(start),
      to = point(end);
    let d =
      "M " +
      from.x +
      " " +
      from.y +
      " A " +
      radius +
      " " +
      radius +
      " 0 0 1 " +
      to.x +
      " " +
      to.y;
    let fontSize = ui.memoFont; // 선 끝 메모와 같은 화면 글자 크기
    let value = titleValues[selectedArea][i].replace(/\n/g, " ");
    let editing = document.activeElement === input.elt;
    let display = value || (editing ? "" : "title" + (i + 1));
    if (editing && Math.floor(millis() / 500) % 2 === 0) {
      let caret =
        input.elt.selectionStart == null
          ? value.length
          : input.elt.selectionStart;
      display = display.slice(0, caret) + "│" + display.slice(caret);
    }
    curve.path.setAttribute("d", d);
    curve.text.setAttribute("font-size", fontSize);
    curve.text.setAttribute("fill", !value && !editing ? "#A0A0A0" : "#333333");
    curve.text.setAttribute("dy", fontSize * 0.3);
    curve.textPath.textContent = display;
    let available = ((radius * Math.abs(end - start) * Math.PI) / 180) * 0.94;
    if (measureMemoText(display, fontSize) > available) {
      curve.textPath.setAttribute("textLength", available);
      curve.textPath.setAttribute("lengthAdjust", "spacingAndGlyphs");
    } else {
      curve.textPath.removeAttribute("textLength");
      curve.textPath.removeAttribute("lengthAdjust");
    }
    curve.wrapper.style.display = "block";
    // 실제 입력창도 같은 위치에 두되 글자는 곡선에서만 표시
    let middle = point((start + end) / 2);
    input.size(Math.max(40, available));
    input.style("left", middle.x - Math.max(40, available) / 2 + "px");
    input.style("top", middle.y - 10 + "px");
  }
  function updateFieldVisibility() {
    let opening = mode === "moving" && transition && transition.open;
    if (mode !== "layers" && !opening) return;
    if (layersReady() && !titlesShown) {
      titlesShown = true;
      for (let i = 0; i < 3; i++) {
        titleInputs[selectedArea][i].show();
        placeTitleInput(i);
      }
    }
    let memoReady =
      lineRevealStart !== null &&
      millis() >= lineRevealStart + lineDrawDuration + memoTextDelay;
    if (
      mode === "layers" &&
      indexBlend === 1 &&
      memoReady &&
      !memoInputsShown
    ) {
      memoInputsShown = true;
      for (let memo of memos)
        if (memo.area === selectedArea && memo.input) memo.input.show();
      positionVisibleInputs();
    }
  }
  function positionVisibleInputs() {
    let opening = mode === "moving" && transition && transition.open;
    if (mode !== "layers" && !opening) return;
    for (let memo of memos) {
      if (
        memo.input &&
        memo.area === selectedArea &&
        memo.input.elt.style.display !== "none"
      ) {
        placeMemoInput(memo);
      }
    }
    for (let i = 0; i < 3; i++) {
      let input = titleInputs[selectedArea][i];
      if (input && input.elt.style.display !== "none") placeTitleInput(i);
    }
  }
  function hideInputs() {
    for (let curve of titleCurves.flat())
      if (curve) curve.wrapper.style.display = "none";
    for (let input of memos
      .map((memo) => memo.input)
      .concat(titleInputs.flat())) {
      if (input) {
        input.elt.blur();
        input.hide();
      }
    }
    for (let curve of titleCurves.flat())
      if (curve) curve.wrapper.style.display = "none";
  }

  // 8. 드로잉 지우기: 지우개 안의 점을 제외하고 획을 다시 연결
  function eraseDrawing() {
    let touches = [...fingers.values()];
    let point = drawingPoint(
      (touches[0].x + touches[1].x) / 2,
      (touches[0].y + touches[1].y) / 2,
    );
    let remaining = [];
    for (let points of drawings[selectedArea]) {
      let part = [];
      for (let i = 0; i < points.length; i++) {
        let a = points[max(0, i - 1)],
          b = points[i];
        let steps = max(1, ceil(pointDistance(a, b) / (r * 0.025)));
        for (let j = 1; j <= steps; j++) {
          let next = mix(a, b, j / steps);
          if (pointDistance(next, point) <= r * 0.14) {
            if (part.length) remaining.push(part);
            part = [];
          } else part.push(next);
        }
      }
      if (part.length) remaining.push(part);
    }
    drawings[selectedArea] = remaining;
  }

  // p5.js에서 사용하는 함수만 외부에 연결
  window.setup = setup;
  window.draw = draw;
})();
