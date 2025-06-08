'use client'
import React, { Component } from 'react'
import WelcomeBanner from './WelcomeBanner'
import AiToolsList from './AiToolsList'
import History from './History'

type Props = {}

type State = {}

class AiAssistant extends Component<Props, State> {
  state = {}

  render() {
    return (
      <>
        <AiToolsList />
        <History />
      </>
    )
  }
}

export default AiAssistant