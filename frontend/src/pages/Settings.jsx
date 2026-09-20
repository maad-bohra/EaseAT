import { useTheme } from '../context/ThemeContext.jsx';
import { IconSun, IconMoon } from '../components/icons.jsx';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>How Attendly looks and behaves, just for you.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card-head">
          <h3>Appearance</h3>
        </div>
        <div className="spread">
          <div className="row">
            <span className="card-icon sky">{dark ? <IconMoon size={18} /> : <IconSun size={18} />}</span>
            <div>
              <strong style={{ display: 'block' }}>Dark mode</strong>
              <span className="small muted">{dark ? 'On — easier on the eyes at night.' : 'Off — the default bright theme.'}</span>
            </div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={dark} onChange={toggleTheme} aria-label="Toggle dark mode" />
            <span className="switch-track"><span className="switch-thumb" /></span>
          </label>
        </div>
      </div>
    </>
  );
}
