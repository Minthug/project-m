import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';
import { sentry } from '@granite-js/plugin-sentry';

export default defineConfig({
  scheme: 'intoss',
  appName: 'project-m',
  plugins: [
    sentry({ useClient: false }),
    appsInToss({
      brand: {
        displayName: '들어줄게', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
        primaryColor: '#3182F6', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
        icon: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNDAyMDVfMTI4%2FMDAxNzA3MTMxODYxMjg1.qgxxSfrbGWa5qkRZdhSXdFvvB2a_FRNMcZ5jy7VzxO0g.uVsEpTU_8f--1BuZOiptlrGyim5qlS53mZYkz1_VvM8g.JPEG.begoodyou1%2F%25B4%25D9%25BF%25EE%25B7%25CE%25B5%25E5%25C6%25C4%25C0%25CF%25A3%25DF20240205%25A3%25DF201710.jpg&type=l340_165', // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
      },
      permissions: [
         {
          name: "clipboard",
          access: "read",
        },
        {
          name: "clipboard",
          access: "write",
        },
        {
          name: "camera",
          access: "access",
        },
        {
          name: "photos",
          access: "read",
        },
      ],
    }),
  ],
});
