import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignInPage() {
    return (
        <main className="h-[100dvh] overflow-y-auto overflow-x-hidden relative flex flex-col pt-6 pb-12 px-4 sm:pt-12">
            <div className="w-full max-w-md mx-auto relative z-20 mb-8 sm:mb-12">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                    <span className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-violet-500 transition-colors">←</span>
                    Back to Home
                </Link>
            </div>

            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-3xl" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-700/20 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md mx-auto flex flex-col justify-center pb-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold shadow-lg">
                            R
                        </div>
                        <span className="text-2xl font-bold gradient-text">RideLane</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                    <p className="text-gray-400 mt-1">Sign in to continue to your dashboard</p>
                </div>

                <div className="flex justify-center">
                    <SignIn
                        appearance={{
                            elements: {
                                rootBox: 'w-full',
                                card: 'bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl',
                                headerTitle: 'text-white',
                                headerSubtitle: 'text-gray-400',
                                socialButtonsBlockButton: 'bg-white/10 border-white/20 text-white hover:bg-white/20',
                                formFieldInput: 'bg-white/10 border-white/20 text-white placeholder-gray-500 focus:border-violet-500',
                                formFieldLabel: 'text-gray-300',
                                footerActionLink: 'text-violet-400 hover:text-violet-300',
                                formButtonPrimary: 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500',
                                dividerLine: 'bg-white/10',
                                dividerText: 'text-gray-500',
                            },
                        }}
                    />
                </div>
            </div>
        </main>
    );
}
