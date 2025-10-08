import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState<string>(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>React + TypeScript + Yarn PnP</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Using @typescript/native-preview for faster TypeScript compilation
        </p>
      </header>
    </div>
  )
}

export default App
