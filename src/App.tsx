import { useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { AvatarLoadoutProvider } from './contexts/AvatarLoadoutContext'
import { BattleScreen } from './components/BattleScreen'
import { AvatarCreateScreen } from './components/AvatarCreateScreen'
import { GameScreen } from './components/GameScreen'

export default function App() {
  const [screen, setScreen] = useState<'battle' | 'avatar' | 'world'>('battle')

  return (
    <AuthProvider>
      <AvatarLoadoutProvider>
        {screen === 'world' ? (
          <GameScreen onBack={() => setScreen('battle')} />
        ) : screen === 'battle' ? (
          <BattleScreen
            onOpenAvatar={() => setScreen('avatar')}
            onOpenWorld={() => setScreen('world')}
          />
        ) : (
          <AvatarCreateScreen onDone={() => setScreen('battle')} />
        )}
      </AvatarLoadoutProvider>
    </AuthProvider>
  )
}
