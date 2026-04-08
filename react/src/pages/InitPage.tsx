import { useEffect } from 'react';
import { preload } from '@imgly/background-removal';
import InitPageApp from '../modules/initPage/App';
import { BG_REMOVAL_CONFIG } from '../modules/initPage/config/backgroundRemoval';

export default function InitPage() {
  useEffect(() => {
    preload(BG_REMOVAL_CONFIG as Parameters<typeof preload>[0]).catch(console.warn);
  }, []);

  return <InitPageApp />;
}
