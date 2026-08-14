type ThemeToggleButtonProps = {
  mode: 'dark' | 'light'
  onToggle: () => void
}

function ThemeToggleButton({ mode, onToggle }: ThemeToggleButtonProps) {
  const nextMode = mode === 'dark' ? 'Light' : 'Dark'

  return (
    <button className="theme-toggle" type="button" onClick={onToggle}>
      Switch to {nextMode} Mode
    </button>
  )
}

export default ThemeToggleButton
