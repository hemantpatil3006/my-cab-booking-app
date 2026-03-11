import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect('/onboarding');

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-700/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-700/20 blur-3xl pointer-events-none" />

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 md:px-8 py-4 md:py-5 z-[50] glass border-none">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-xs md:text-sm shadow-lg">
            R
          </div>
          <span className="text-base md:text-lg font-bold gradient-text">RideLane</span>
        </div>
        <div className="flex gap-2 md:gap-3">
          <Link href="/sign-in" className="btn-secondary text-[10px] md:text-sm py-1.5 md:py-2 px-3 md:px-4">Sign In</Link>
          <Link href="/sign-up" className="btn-primary text-[10px] md:text-sm py-1.5 md:py-2 px-3 md:px-4">Get Started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 text-center max-w-4xl mx-auto pt-24 md:pt-0">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 md:px-4 md:py-2 mb-6 md:mb-8 text-[10px] md:text-sm text-violet-300">
          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400 animate-pulse" />
          Rides available near you
        </div>

        <h1 className="text-4xl sm:text-7xl font-extrabold leading-tight mb-4 md:mb-6">
          Your ride,{' '}
          <span className="gradient-text">on demand.</span>
        </h1>

        <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed px-4 md:px-0">
          RideLane connects riders with trusted drivers in seconds. Sign up as a{' '}
          <span className="text-violet-400 font-semibold">Rider</span> to book your trip, or as a{' '}
          <span className="text-cyan-400 font-semibold">Driver</span> to start earning.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/sign-up" className="btn-primary text-base px-8 py-4 w-full sm:w-auto">
            🚗 Book a Ride
          </Link>
          <Link href="/sign-up" className="btn-secondary text-base px-8 py-4 w-full sm:w-auto">
            🚕 Become a Driver
          </Link>
        </div>

        {/* Stats strip */}
        <div className="mt-12 md:mt-20 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto px-4 md:px-0">
          {[
            { label: 'Active Riders', value: '12K+' },
            { label: 'Verified Drivers', value: '3.4K+' },
            { label: 'Rides Completed', value: '98K+', hideOnMobile: true },
          ].map((stat) => (
            <div key={stat.label} className={`card p-4 md:p-6 text-center ${stat.hideOnMobile ? 'hidden sm:block' : ''}`}>
              <p className="text-xl sm:text-3xl font-extrabold gradient-text">{stat.value}</p>
              <p className="text-[10px] md:text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
