import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ size = 'default' }) => {
  const { isDark, toggleTheme } = useTheme();

  const isSmall = size === 'small';
  const buttonSize = isSmall ? 'w-9 h-9' : 'w-10 h-10';
  const iconSize = isSmall ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative ${buttonSize} flex items-center justify-center rounded-full transition-colors duration-300
        bg-gray-100 hover:bg-gold-100
        dark:bg-dark-card dark:hover:bg-gold-900/40
        border border-gray-200 dark:border-dark-border
        text-gray-700 dark:text-gold-400
        hover:text-gold-600 dark:hover:text-gold-300
        shadow-sm hover:shadow-md
        overflow-hidden
      `}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ y: 20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.25 }}
            className="absolute"
          >
            <Sun className={iconSize} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ y: 20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.25 }}
            className="absolute"
          >
            <Moon className={iconSize} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default ThemeToggle;