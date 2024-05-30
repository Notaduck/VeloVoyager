import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/authenticated/home')({
  component: Home
})

function Home(){
  return (
 <div>Hello /user/home!</div>
  )
}