import { ArrowUpRight, Globe2, Leaf, RefreshCw, ShieldCheck, Sprout, Target } from 'lucide-react';
const rules = [
  {
    icon: Sprout,
    title: 'Semez votre stratégie',
    text: 'À tour de rôle, videz une case de votre rangée. Déposez une graine par case dans le sens indiqué sur le plateau. Les greniers restent en dehors du parcours.',
  },
  {
    icon: Target,
    title: 'Récoltez au bon endroit',
    text: 'Une arrivée dans le camp adverse permet de capturer une case de 2 à 4 graines. Remontez les cases précédentes tant qu’elles remplissent cette condition.',
  },
  {
    icon: ShieldCheck,
    title: 'Gardez le jeu vivant',
    text: 'Une récolte qui viderait le camp adverse est annulée. Si ce camp est vide, donnez-lui 7 graines au moins ; si cela est impossible, donnez le maximum disponible.',
  },
  {
    icon: Leaf,
    title: 'Visez les 40 graines',
    text: 'La partie s’achève à 40 prises, à moins de 10 graines sur le plateau, ou si personne ne peut nourrir le camp vide. Les graines restantes reviennent à leur camp. Sans 40 graines, le résultat est nul.',
  },
];
export default function Rules() {
  return (
    <div className="rules-content">
      <div className="rules-intro">
        <span className="eyebrow">UN HÉRITAGE À PARTAGER</span>
        <h3>
          Simple à apprendre.
          <br />
          Passionnant à maîtriser.
        </h3>
        <p>
          Le Songo appartient à la famille des jeux de semailles et à la culture des peuples ekang
          d’Afrique centrale. Deux camps, quatorze cases, soixante-dix graines : chaque décision
          compte.
        </p>
      </div>
      <div className="rules-grid">
        {rules.map(({ icon: Icon, title, text }, i) => (
          <article key={title}>
            <div className="rule-number">
              <Icon size={20} />
              <span>0{i + 1}</span>
            </div>
            <h4>{title}</h4>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <details className="advanced-rules">
        <summary>Les cas particuliers de cette variante</summary>
        <ul>
          <li>
            Après les 13 premières graines d’une longue semaille, la distribution continue
            uniquement dans le camp adverse, en repartant de sa première case.
          </li>
          <li>
            La première case adverse est protégée à l’arrivée, mais peut faire partie d’une capture
            en chaîne. Une longue semaille qui y arrive capture seulement la dernière graine, sauf
            si cela vide le camp.
          </li>
          <li>
            La dernière case de votre rangée ne se joue avec 1 ou 2 graines que si vous n’avez aucun
            autre choix. Ces graines sont alors attribuées au grenier adverse.
          </li>
          <li>
            Pour éviter une boucle sans fin, cette application déclare une partie nulle à la
            troisième répétition d’une position ou à 600 coups. Ce sont des conventions numériques
            ajoutées.
          </li>
        </ul>
      </details>
      <div className="source-note">
        <Globe2 size={19} />
        <p>
          Plusieurs traditions et seuils de victoire coexistent. Ici : variante Ekang décrite par le
          Club Awalé, seuil de 40 graines.{' '}
          <a
            href="https://www.clubawale.com/post/comment-jouer-le-songo"
            target="_blank"
            rel="noreferrer"
          >
            Consulter la source <ArrowUpRight size={13} />
          </a>
        </p>
      </div>
      <div className="learning-tip">
        <RefreshCw size={18} />
        <span>
          Le meilleur professeur, c’est le plateau. Commencez en mode Découverte et utilisez les
          conseils.
        </span>
      </div>
    </div>
  );
}
