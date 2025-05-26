import React, { useState, useEffect } from 'react';

export default function HireMeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const scrollPosition = window.scrollY + window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;

      // Show modal if user scrolled to last 10% of page
      if (scrollPosition > pageHeight * 0.9) {
        setShow(true);
        window.removeEventListener('scroll', handleScroll);
      }
    }

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <p style={{ marginBottom: 20 }}>
          Looking for a DevOps or DevSecOps engineer? Want to recommend or hire Abdulmalik?
        </p>
        <button
          style={styles.button}
          onClick={() => {
            window.location.href = 'mailto:abdulmalik@saintmalik.me?subject=Job%20Opening%20for%20DevOps%20or%20DevSecOps%20Engineer&body=We%20have%20an%20opening%20for%20you!';
          }}
        >
          Yes
        </button>
        <button
          style={{ ...styles.button, backgroundColor: '#ccc', marginLeft: 10 }}
          onClick={() => setShow(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    zIndex: 9999,
    left: 0,
    top: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#222',
    padding: 20,
    borderRadius: 8,
    color: '#fff',
    maxWidth: 400,
    textAlign: 'center',
  },
  button: {
    cursor: 'pointer',
    padding: '10px 20px',
    fontSize: 16,
    borderRadius: 5,
    border: 'none',
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
};
