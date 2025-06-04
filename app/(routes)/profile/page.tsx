import { UserProfile } from '@clerk/nextjs'
import React from 'react'

type Props = {}

function Profile({}: Props) {
  return (
    <div>
        <UserProfile />
    </div>
  )
}

export default Profile