---
title: 📝 Notes
sidebar_position: 1
slug: /
---

import Link from '@docusaurus/Link';

export const NoteCard = ({title, href, date}) => (
  <Link to={href} className="note-card">
    <span className="note-card-title">{title}</span>
    {date && <span className="note-card-date">{date}</span>}
  </Link>
);

export const CategorySection = ({title, children}) => (
  <div className="notes-category">
    <h2 className="notes-category-title">{title}</h2>
    <div className="notes-grid">{children}</div>
  </div>
);

<style>
{`
  .notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 2.5rem;
  }

  .note-card {
    display: flex;
    flex-direction: column;
    padding: 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    text-decoration: none !important;
    transition: all 0.2s ease;
  }

  .note-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-2px);
  }

  .note-card-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: #e5e7eb;
    line-height: 1.4;
  }

  .note-card-date {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.35);
    margin-top: 0.5rem;
  }

  .notes-category-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .notes-header {
    margin-bottom: 2.5rem;
  }

  .notes-header h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .notes-header p {
    color: rgba(255, 255, 255, 0.5);
    font-size: 1rem;
    margin: 0;
  }
`}
</style>

<div className="notes-header">

# Notes

A collection of quick notes, solutions, and learnings from my day-to-day work in DevSecOps, Kubernetes, and software engineering.

</div>

<CategorySection title="💪 Solutions to Bugs & Day-to-Day Activities">
  <NoteCard title="Debug Crontab Tasks" href="debug-crontab-tasks" date="Sep 1, 2021" />
  <NoteCard title="Fix Docusaurus Bugs" href="fix-docusaurus-solutions" date="Sep 7, 2021" />
  <NoteCard title="Convert Images to WebP" href="converting-images-to-webp" date="Jan 5, 2021" />
  <NoteCard title="Setting Up Ghost Blog on Linode" href="setting-up-ghost-blog-on-linode" date="Dec 6, 2021" />
  <NoteCard title="Open Source Intelligence (OSINT)" href="osint" date="2021" />
  <NoteCard title="VPS Workspace Accessibility" href="vps-workspace-accessibility" date="Feb 25, 2022" />
  <NoteCard title="Bulk Typo Fixing" href="bulk-typo-fixing" date="Apr 4, 2022" />
  <NoteCard title="Subdomain Checks" href="subdomain-checks" date="2022" />
  <NoteCard title="VPS Issues" href="vps-issues" date="2022" />
  <NoteCard title="HackTheBox Invite" href="hackthebox-invite" date="2021" />
  <NoteCard title="Wameir" href="wameir" date="2022" />
  <NoteCard title="Hussein D Talk Series" href="hussein-d-talk-series" date="2022" />
  <NoteCard title="Delete Recent Commits" href="delete-recent-commits-from-any-git-branch-locally-and-remotely" date="Sep 13, 2022" />
  <NoteCard title="ArgoCD Related Issues" href="argocd-related-issues" date="Jan 15, 2023" />
  <NoteCard title="Automate WebP Blog Images" href="automate-webp-blog" date="Jan 15, 2023" />
  <NoteCard title="Delete GitHub Action Workflows" href="delete-ran-workflow" date="Mar 3, 2023" />
  <NoteCard title="Confirm Sourced Files in Bash" href="confirm-sourced-files" date="Mar 15, 2023" />
  <NoteCard title="Remove First Git Commit" href="git-remove-first-commmit" date="Mar 22, 2023" />
  <NoteCard title="Bash Set Options" href="bash-set-options" date="Mar 30, 2023" />
  <NoteCard title="Container Image Scanning" href="container-image-scan" date="Apr 16, 2023" />
  <NoteCard title="Force Delete K8s Resources" href="delete-k8s-resource" date="Jun 8, 2023" />
  <NoteCard title="EKS ALB Nodes Controller" href="eks-alb-nodes-controller" date="Jun 8, 2023" />
  <NoteCard title="Docker Credential Desktop" href="docker-credential-desktop" date="2023" />
  <NoteCard title="AWS VPC" href="vpc" date="2023" />
  <NoteCard title="Android Notes" href="android" date="2023" />
  <NoteCard title="Sockets Service ALB" href="sockets-service-alb" date="2023" />
  <NoteCard title="Sockets with Nginx" href="sockets-nginx" date="2023" />
  <NoteCard title="SigNoz Observability" href="signoz" date="2023" />
  <NoteCard title="SOPS Secrets Management" href="sops" date="2023" />
  <NoteCard title="HashiCorp Vault" href="vault" date="2023" />
  <NoteCard title="Cloud Run Load Balancing" href="cloudrun-loadbalancing" date="2023" />
  <NoteCard title="Squeeze Kubernetes Nodes" href="squeeze-node" date="2023" />
  <NoteCard title="Alpha Channels" href="alpha-channels" date="2023" />
  <NoteCard title="Managing KMS Keys for Vault" href="managing-kms-key-for-vault" date="2023" />
  <NoteCard title="MongoDB Notes" href="mongo" date="2023" />
  <NoteCard title="Unterminated K8s Namespace" href="unterminated-kubernetest-namespace" date="2023" />
</CategorySection>

<CategorySection title="📝 Learning GoLang">
  <NoteCard title="Variables in GoLang" href="variables-in-golang" date="Sep 7, 2021" />
  <NoteCard title="Arrays in GoLang" href="arrays-in-golang" date="Sep 10, 2021" />
</CategorySection>

<CategorySection title="⚡ Could Help You">
  <NoteCard title="Free Custom Mails for Startups" href="custom-mails" date="Jul 17, 2022" />
  <NoteCard title="Building a Startup? Here's My Take" href="mistakes-were-made" date="Apr 16, 2023" />
</CategorySection>

<CategorySection title="🚀 Infrastructure as Code (Terraform)">
  <NoteCard title="Terraform Kickstart with AWS" href="terraform-kickstart" date="Feb 7, 2023" />
  <NoteCard title="EKS vs EC2 Differences" href="eks-ec2" date="Jan 23, 2023" />
  <NoteCard title="Terraform Destroy" href="terraform-destroy" date="Feb 7, 2023" />
  <NoteCard title="Terraform Destroy Errors" href="terraform-destroy-error" date="Apr 16, 2023" />
  <NoteCard title="AMD64 vs ARM64" href="amd64-arm64" date="Apr 16, 2023" />
  <NoteCard title="Terraform Scripts" href="tf-scripts" date="2023" />
  <NoteCard title="Terragrunt" href="terragrunt" date="2023" />
</CategorySection>
