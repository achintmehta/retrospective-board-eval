import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GuestAuthModal({ open, onSubmit }) {
  const [name, setName] = useState('');
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Enter your display name"
          >
            <div className="modal__glow" aria-hidden="true" />
            <div className="modal__head">
              <h2 className="modal__title">Choose your display name</h2>
              <p className="modal__sub">
                Cards and comments will show this name. It's stored only in your browser session.
              </p>
            </div>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const cleaned = name.trim();
                if (!cleaned) return;
                onSubmit(cleaned);
              }}
            >
              <label className="field">
                <span className="field__label">Display name</span>
                <input
                  autoFocus
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={40}
                  required
                />
              </label>
              <button
                className="btn btn--primary btn--lg"
                type="submit"
                disabled={!name.trim()}
              >
                Enter board →
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
