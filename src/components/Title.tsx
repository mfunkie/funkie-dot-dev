import * as React from 'react'
import { NavImage } from './Nav'

const MemoNav = React.memo(NavImage)

export function TitleWithNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="title-with-nav">
      <Title>{children}</Title>
      <MemoNav />
    </div>
  )
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="title">{children}</h1>
}