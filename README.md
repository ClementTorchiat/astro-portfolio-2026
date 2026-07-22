# Portfolio de Clément Torchiat

> Directeur Artistique, UX/UI Designer & Développeur Web.

[![Website](https://img.shields.io/badge/Live-Visiter_le_site-b79e86?style=for-the-badge&logo=vercel)](https://clement-torchiat.fr/)

## À propos

Bienvenue sur le code source de mon portfolio personnel. Ce projet reflète ma double expertise en **design (DA / UX-UI)** et en **développement web**.

Le design se veut volontairement **minimaliste**, habillé de **tons pastels beiges** pour mettre en valeur les projets et l'expérience utilisateur tout en douceur. Une attention toute particulière a été portée sur les micro-interactions et le ressenti global de la navigation.

## Stack Technique & Outils

Ce portfolio est construit avec une architecture moderne axée sur la performance absolue et l'expérience utilisateur :

*   **[Astro](https://astro.build/)** - Framework principal (Génération statique et performances optimales).
*   **React (Astro Islands)** - Utilisé via l'architecture en îles pour isoler les composants interactifs sans alourdir le reste de la page.
*   **Astro Content Collections** - Pour la gestion structurée du contenu (projets, études de cas, etc.) avec typage strict.
*   **GSAP** - Bibliothèque d'animation pour des mouvements complexes et fluides.
*   **Astro View Transitions** - Pour des transitions de pages natives sans rechargement visuel.

## Fonctionnalités Clés & Défis Techniques

*   **Animations sur-mesure & Fluides :** De nombreuses heures ont été dédiées au peaufinage des animations avec **GSAP** pour apporter une touche haut de gamme et organique, digne d'une direction artistique soignée.
*   **Navigation de type "SPA" :** L'utilisation combinée des **View Transitions d'Astro** et des chorégraphies GSAP offre une expérience de navigation continue, tout en gardant le SEO et les performances d'un site multipage statique.
*   **Design Minimaliste et Accessible :** Une interface épurée aux tons pastels beiges pensée pour s'effacer au profit du contenu, tout en offrant des repères visuels clairs.
*   **Performances par défaut :** Zéro JavaScript inutile envoyé au client grâce aux îles Astro.

## Installation locale

Pour explorer le code :

```bash
# 1. Cloner le dépôt
git clone https://github.com/ClementTorchiat/astro-portfolio-2026.git

# 2. Naviguer dans le dossier
cd astro-portfolio-2026

# 3. Installer les dépendances
npm install
# ou yarn install / pnpm install

# 4. Lancer le serveur de développement
npm run dev