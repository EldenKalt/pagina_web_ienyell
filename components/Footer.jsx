'use client';

import { useEffect, useRef } from 'react';

export default function Footer() {
  const footerRef = useRef(null);
  const socials = [
    { name: 'Instagram', icon: '/recursos/icon_social/_Instagram.svg', href: '#' },
    { name: 'TikTok', icon: '/recursos/icon_social/_TikTok.svg', href: '#' },
    { name: 'Twitter', icon: '/recursos/icon_social/_Twitter.svg', href: '#' },
    { name: 'LinkedIn', icon: '/recursos/icon_social/_Linkedin.svg', href: '#' },
    { name: 'YouTube', icon: '/recursos/icon_social/_YouTube.svg', href: '#' },
    { name: 'Wattpad', icon: '/recursos/icon_social/_Wattpad.svg', href: '#' },
    { name: 'GitHub', icon: '/recursos/icon_social/_Github.svg', href: '#' },
    { name: 'Behance', icon: '/recursos/icon_social/Behance.svg', href: '#' },
    { name: 'Dribbble', icon: '/recursos/icon_social/Dribbble.svg', href: '#' },
  ];

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        footer.classList.add('is-visible');
        observer.disconnect();
      },
      { threshold: 0.2 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="footer" ref={footerRef}>
      <div className="social-icons">
        {socials.map((s) => (
          <a key={s.name} href={s.href} aria-label={s.name} data-label={s.name}>
            <img src={s.icon} alt={s.name} />
          </a>
        ))}
      </div>
      <p className="footer-copy">&copy; 2022 All the content on this page is protected by copyright. Site developed by Enyell Moya</p>
    </footer>
  );
}
