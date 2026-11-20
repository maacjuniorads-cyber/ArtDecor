import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import styles from './BottomNav.module.css';

const abas: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Início', icon: 'inicio' },
  { to: '/estoque', label: 'Estoque', icon: 'estoque' },
  { to: '/pedidos', label: 'Pedidos', icon: 'pedidos' },
  { to: '/clientes', label: 'Clientes', icon: 'clientes' },
];

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Menu principal" data-tour="menu">
      {abas.map((aba) => (
        <NavLink
          key={aba.to}
          to={aba.to}
          end={aba.to === '/'}
          className={({ isActive }) => (isActive ? `${styles.aba} ${styles.ativa}` : styles.aba)}
        >
          <Icon name={aba.icon} />
          {aba.label}
        </NavLink>
      ))}
    </nav>
  );
}
