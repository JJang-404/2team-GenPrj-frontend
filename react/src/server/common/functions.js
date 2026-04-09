import { BACKEND_BASE_URL } from './defines';

export function getBackendUrl() {
  // In Vite dev, use relative path so requests go through dev-server proxy (/addhelper -> target).
  // if (import.meta.env.DEV) {
  //   return '/addhelper';
  // }

  // In production, allow env override and fallback to constant.
  // return import.meta.env.VITE_BACKEND_BASE_URL || BACKEND_BASE_URL;
  if (import.meta.env.DEV) {
    return "http://localhost:8000/addhelper"
  }

  // 배포 환경 설정
  return import.meta.env.VITE_BACKEND_BASE_URL || 'https://gen-proj.duckdns.org/addhelper';
  //"http://gen-proj.duckdns.org/addhelper"
}

