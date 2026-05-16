import React, { useState } from 'react';

export default function GuestAuthModal({ onSet }: { onSet: (name: string) => void }) {
  const [name, setName] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSet(name.trim());
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', minWidth: '300px' }}>
        <h2>Join Board</h2>
        <form onSubmit={submit}>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Display Name" 
            style={{ padding: '0.5rem', marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }}
            autoFocus
          />
          <button type="submit" style={{ padding: '0.5rem 1rem', width: '100%' }}>Join</button>
        </form>
      </div>
    </div>
  );
}
