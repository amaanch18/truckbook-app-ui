import PhoneMock from './PhoneMock.jsx'
import LaptopMock from './LaptopMock.jsx'

export default function HeroVisual() {
  return (
    <section className="relative flex items-center justify-center gap-6">
      <PhoneMock />
      <LaptopMock />
    </section>
  )
}
