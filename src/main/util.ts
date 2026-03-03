/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';

export function resolveHtmlPath(htmlFileName: string, hash?: string) {
  let base: string;
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    base = url.href;
  } else {
    base = `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
  }
  return hash ? `${base}#${hash}` : base;
}
