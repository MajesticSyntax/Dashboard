import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFavicon(url: string) {
  try {
    const raw = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const domain = new URL(raw).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

/**
 * Normalizes any URL or string into a clean lowercase hostname without 'www.'
 */
export function getCleanHostname(url: string): string {
  if (!url) return '';
  try {
    const raw = url.trim().startsWith('http://') || url.trim().startsWith('https://') 
      ? url.trim() 
      : `https://${url.trim()}`;
    const hostname = new URL(raw).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0].toLowerCase();
  }
}

/**
 * Extracts the base root registered domain (e.g. google.com from mail.google.com,
 * bbc.co.uk from news.bbc.co.uk, etc.)
 */
export function getRootDomain(hostnameOrUrl: string): string {
  if (!hostnameOrUrl) return '';
  const host = hostnameOrUrl.includes('/') || hostnameOrUrl.includes(':') 
    ? getCleanHostname(hostnameOrUrl) 
    : hostnameOrUrl.toLowerCase().replace(/^www\./, '');
    
  if (!host) return '';
  
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  
  // Known two-part TLDs (e.g., .co.uk, .com.au, .co.jp, etc.)
  const knownTwoPartTlds = new Set([
    'co.uk', 'gov.uk', 'ac.uk', 'org.uk', 'me.uk',
    'com.au', 'net.au', 'org.au', 'edu.au',
    'co.nz', 'net.nz', 'org.nz',
    'co.jp', 'ne.jp',
    'co.in', 'net.in', 'org.in',
    'com.br', 'com.mx', 'com.sg', 'com.tr', 'co.za',
    'co.kr', 'com.hk', 'com.tw'
  ]);
  
  const lastTwo = parts.slice(-2).join('.');
  if (knownTwoPartTlds.has(lastTwo)) {
    if (parts.length >= 3) {
      return parts.slice(-3).join('.');
    }
    return host;
  }
  
  return parts.slice(-2).join('.');
}

/**
 * Checks if candidateUrl is a subdomain of parentUrl or root domain
 */
export function isSubdomainOf(candidateUrl: string, parentUrl: string): boolean {
  const candidateHost = getCleanHostname(candidateUrl);
  const parentHost = getCleanHostname(parentUrl);
  if (!candidateHost || !parentHost || candidateHost === parentHost) return false;
  
  return candidateHost.endsWith(`.${parentHost}`);
}
