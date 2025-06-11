'use client';
import React, { Component } from 'react';
import AiToolsList from './AiToolsList';
import History from './History';
// import WelcomeBanner from './WelcomeBanner'; // törölve, ha nincs használva

class AiAssistant extends Component<Record<string, never>, Record<string, never>> {
  state = {};

  render() {
    return (
      <>
        <AiToolsList />
        <History />
      </>
    );
  }
}

export default AiAssistant;
