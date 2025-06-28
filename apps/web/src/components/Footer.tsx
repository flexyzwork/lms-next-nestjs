// import { FileText } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <div className="footer">
      <div className="footer__banner flex justify-center mb-4">
        {/* <Link href="https://blog.flexyz.work" passHref legacyBehavior>
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="footer__banner-link flex items-center gap-3 px-6 py-3 rounded-sm bg-white-50 dark:bg-slate-800 text-white dark:text-gray-100 text-sm shadow-md transition-all duration-300 hover:bg-gray-800 dark:hover:bg-slate-700 w-xl text-center"
          >
            <FileText className="w-6 h-6 text-white dark:text-gray-100" />
            <span>Tech Blog</span>
          </a>
        </Link> */}
      </div>
      <p className="text-gray-700 dark:text-gray-300">&copy; {currentYear} FLEXYZ. All Rights Reserved.</p>
      <div className="footer__links gap-4">
        {['About', 'Privacy Policy', 'Licensing', 'Contact'].map((item) => (
          <Link key={item} href={`/${item.toLowerCase().replace(' ', '-')}`} className="footer__link text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" scroll={false}>
            {item}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Footer;
