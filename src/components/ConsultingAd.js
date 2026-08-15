import React from 'react';

const MAILTO =
  'mailto:abdulmalik@saintmalik.me?subject=Consulting%20Inquiry';

export default function ConsultingAd() {
  return (
    <aside className="consulting-ad" aria-label="Consulting">
      <div className="consulting-ad__kicker">Consulting</div>
      <div className="consulting-ad__text">
        Do you need a DevSecOps consultant, an experienced security consultant, or DevOps?
      </div>
      <a className="consulting-ad__link" href={MAILTO}>
        Mail Abdulmalik
      </a>
    </aside>
  );
}
