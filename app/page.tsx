'use client';

import { useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    window.location.href = '/log-entry';
  }, []);

  return null;
}
