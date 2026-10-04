import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChangeCredentialsModal } from '@/components/auth-gate'
import { openCommandPalette } from '@/components/command-palette-state'
import { SettingsDialog } from '@/components/settings-dialog'
import { usePremium } from '@/hooks/use-premium'
import { useI18n } from '@/i18n'
import { logout } from '@/lib/api'

// True when the dashboard runs inside the desktop shell (Electron preload
// sets this). The navbar then doubles as the window title bar: draggable,
// padded for the macOS traffic lights, and without the web-only Sign out.
export const isDesktopApp =
  typeof window !== 'undefined' &&
  (window as Window & { __FREEAPI_DESKTOP__?: boolean }).__FREEAPI_DESKTOP__ === true

export const desktopPlatform =
  typeof window !== 'undefined'
    ? (window as Window & { __FREEAPI_PLATFORM__?: string }).__FREEAPI_PLATFORM__
    : undefined

export const isMacDesktop =
  isDesktopApp &&
  (desktopPlatform
    ? desktopPlatform === 'darwin'
    : typeof navigator !== 'undefined' && /Macintosh|Mac OS X/.test(navigator.userAgent))

// The preload's own early classList.add can be lost (it may run before this
// document exists), so the client claims the class itself at module load —
// before the first React paint — keeping html.desktop CSS (transparent body,
// glass backdrop on macOS) reliable.
if (isDesktopApp) {
  document.documentElement.classList.add('desktop')
  if (isMacDesktop) {
    document.documentElement.classList.add('desktop-mac')
  }
}

export const navItems = [
  { to: '/models', labelKey: 'nav.models' },
  { to: '/playground', labelKey: 'nav.playground' },
  { to: '/keys', labelKey: 'nav.keys' },
  { to: '/agents', labelKey: 'nav.agents' },
  { to: '/analytics', labelKey: 'nav.analytics' },
  { to: '/premium', labelKey: 'nav.premium' },
]

// The modality pages behind "Models"; surfaced in the nav dropdown and
// the mobile submenu so Fusion/Embeddings/Image/Audio are discoverable without
// first landing on the chat table.
export const modelItems = [
  { to: '/models/chat', labelKey: 'models.chatModelsTab' },
  { to: '/models/embeddings', labelKey: 'models.embeddingsTab' },
  { to: '/models/image', labelKey: 'models.imageTab' },
  { to: '/models/video', labelKey: 'models.videoTab' },
  { to: '/models/audio', labelKey: 'models.audioTab' },
  { to: '/models/fusion', labelKey: 'models.fusionTab' },
]

// The pages that hang off "Analytics". Logs is reachable only from here — it is
// deliberately kept out of navItems so the top bar does not grow a seventh entry.
export const analyticsItems = [
  { to: '/analytics', labelKey: 'nav.analytics' },
  { to: '/logs', labelKey: 'nav.logs' },
]

// Nav entries rendered as a split control: the label still navigates, and a
// chevron (desktop) / submenu (mobile) reveals the pages behind it. Keyed by the
// nav entry's `to` so both branches below stay one lookup, not two hardcoded
// special cases.
export const navMenus: Record<
  string,
  { ariaKey: string; items: { to: string; labelKey: string }[]; isActive: (pathname: string) => boolean }
> = {
  '/models': {
    ariaKey: 'nav.modelsMenu',
    items: modelItems,
    isActive: (pathname) => pathname.startsWith('/models'),
  },
  '/analytics': {
    ariaKey: 'nav.analyticsMenu',
    items: analyticsItems,
    isActive: (pathname) => pathname.startsWith('/analytics') || pathname.startsWith('/logs'),
  },
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative text-sm px-1 py-4 transition-colors ${isActive
          ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-foreground'
          : 'text-muted-foreground hover:text-foreground'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
      <span className="inline-block size-2 rounded-full bg-foreground" />
      <span className="font-semibold tracking-tight text-sm">FreeLLMAPI</span>
    </Link>
  )
}

function AccountMenuItems({
  showUpgrade,
  upgradeLabel,
  settingsLabel,
  signOutLabel,
  changeEmailLabel,
  changePasswordLabel,
  onUpgrade,
  onOpenSettings,
  onChangeEmail,
  onChangePassword,
}: {
  showUpgrade: boolean
  upgradeLabel: string
  settingsLabel: string
  signOutLabel: string
  changeEmailLabel: string
  changePasswordLabel: string
  onUpgrade: () => void
  onOpenSettings: () => void
  onChangeEmail: () => void
  onChangePassword: () => void
}) {
  return (
    <>
      {showUpgrade && (
        <DropdownMenuItem onClick={onUpgrade}>
          <Sparkles />
          {upgradeLabel}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={onOpenSettings}>
        <Settings />
        {settingsLabel}
      </DropdownMenuItem>
      {/* Desktop signs in with a hidden local account, so it has no credentials
          to change and no session to end. */}
      {!isDesktopApp && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onChangeEmail}>
            <span className="flex size-4 items-center justify-center font-serif text-xs font-bold">@</span>
            {changeEmailLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onChangePassword}>
            <KeyRound />
            {changePasswordLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut />
            {signOutLabel}
          </DropdownMenuItem>
        </>
      )}
    </>
  )
}

export function Navbar() {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [credentialsMode, setCredentialsMode] = useState<'password' | 'email' | null>(null)
  const { data: premium, licensed, isLoading: premiumLoading, isError: premiumError } = usePremium()
  const showUpgrade = Boolean(premium) && !licensed && !premiumLoading && !premiumError

  return (
    <>
      <header
        // In macOS desktop shell the window carries vibrancy blur, so a lighter wash (45%)
        // lets it read as glass. Everywhere else (Windows/Linux/browser), use solid wash (80%)
        // so text and contrast stay sharp and readable.
        className={`sticky top-0 z-40 border-b backdrop-blur ${isMacDesktop ? 'bg-background/45' : 'bg-background/80'}`}
        style={isDesktopApp ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
      >
        <div
          // Physical pl: reserves macOS traffic lights only on macOS. On Windows and Linux,
          // standard window controls sit on the top-right, so no left padding is needed.
          className={`mx-auto flex max-w-6xl items-center px-4 sm:px-6 ${isMacDesktop ? 'pl-20 sm:pl-20' : ''}`}
          style={isMacDesktop ? { minHeight: 52 } : undefined}
        >
          <Brand />
          <nav
            className="ms-10 hidden items-center gap-6 md:flex"
            style={isDesktopApp ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
          >
            {navItems.map((item) => {
              const menu = navMenus[item.to]
              return menu ? (
                // Split control: the label navigates, the chevron reveals the
                // pages hiding behind it.
                <div key={item.to} className="flex items-center gap-0.5">
                  <NavItem to={item.to}>{t(item.labelKey)}</NavItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={t(menu.ariaKey)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ChevronDown className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      {menu.items.map((entry) => (
                        <DropdownMenuItem key={entry.to} onClick={() => navigate(entry.to)}>
                          {t(entry.labelKey)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <NavItem key={item.to} to={item.to}>
                  {t(item.labelKey)}
                </NavItem>
              )
            })}
          </nav>
          <div
            className="ms-auto hidden items-center gap-1 md:flex"
            style={isDesktopApp ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
          >
            <button
              type="button"
              onClick={openCommandPalette}
              aria-label={t('palette.title')}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <Search className="size-3.5" />
              <kbd className="text-[10px] text-muted-foreground">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                aria-label={t('nav.openMenu')}
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <AccountMenuItems
                  showUpgrade={showUpgrade}
                  upgradeLabel={t('nav.upgrade')}
                  settingsLabel={t('nav.settings')}
                  signOutLabel={t('nav.signOut')}
                  changeEmailLabel={t('auth.changeEmail')}
                  changePasswordLabel={t('auth.changePassword')}
                  onUpgrade={() => navigate('/premium')}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onChangeEmail={() => setCredentialsMode('email')}
                  onChangePassword={() => setCredentialsMode('password')}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="ms-auto md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                aria-label={t('nav.openMenu')}
              >
                <Menu />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  {navItems.map((item) => {
                    const menu = navMenus[item.to]
                    return menu ? (
                      <DropdownMenuSub key={item.to}>
                        <DropdownMenuSubTrigger
                          className={menu.isActive(location.pathname) ? 'bg-accent text-accent-foreground font-medium' : undefined}
                        >
                          {t(item.labelKey)}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {menu.items.map((entry) => (
                            <DropdownMenuItem key={entry.to} onClick={() => navigate(entry.to)}>
                              {t(entry.labelKey)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ) : (
                      <DropdownMenuItem
                        key={item.to}
                        onClick={() => navigate(item.to)}
                        className={location.pathname === item.to ? 'bg-accent text-accent-foreground font-medium' : undefined}
                      >
                        {t(item.labelKey)}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <AccountMenuItems
                  showUpgrade={showUpgrade}
                  upgradeLabel={t('nav.upgrade')}
                  settingsLabel={t('nav.settings')}
                  signOutLabel={t('nav.signOut')}
                  changeEmailLabel={t('auth.changeEmail')}
                  changePasswordLabel={t('auth.changePassword')}
                  onUpgrade={() => navigate('/premium')}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onChangeEmail={() => setCredentialsMode('email')}
                  onChangePassword={() => setCredentialsMode('password')}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {credentialsMode && (
        <ChangeCredentialsModal mode={credentialsMode} onClose={() => setCredentialsMode(null)} />
      )}
    </>
  )
}

export default Navbar
