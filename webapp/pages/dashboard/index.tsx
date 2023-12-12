// Copyright 2023 mik
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use client';

import Card from '@/components/common/Card';
import Searchbar from '@/components/common/Searchbar';
import useTranslation from '@/hooks/useTranslation';
import Image from 'next/image';
import Link from 'next/link';
import { BiLogoDiscordAlt, BiLogoGithub } from 'react-icons/bi';

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <header className="flex w-full items-center gap-8 px-4 py-3">
        <div className="h-center text-2xl font-extrabold">Opla</div>
        <Searchbar />
        <div className="flex w-full items-center gap-8">
          <div>{t('Prompts')}</div>
          <div>{t('Models')}</div>
          <div className="truncate">{t('AI Providers')}</div>
        </div>
        <div className="mr-8 flex w-full flex-row-reverse items-center gap-4">
          <a href="https://discord.gg/RJD4Xa2Y" target="_blank" className="" aria-label="Discord">
            <BiLogoDiscordAlt />
          </a>
          <a href="https://github.com/Opla/opla" target="_blank" className="" aria-label="Github">
            <BiLogoGithub />
          </a>
          <a href="https://opla.ai" target="_blank">
            opla.ai
          </a>
        </div>
      </header>
      <main className="h-full w-full flex-col overflow-y-auto p-4 pb-10">
        <div className="m-4 flex min-h-[320px] flex-row rounded-lg bg-gray-100 p-3 dark:bg-gray-950">
          <div className="flex flex-grow flex-col justify-center p-3">
            <h1 className="w-full text-center text-xl">
              {t('The ultimate Open-source generative AI App')}
            </h1>
            <h2 className="w-full text-center text-sm font-light">
              {t('Run on your machine and prompt to any open LLMs & more.')}
            </h2>
            <p className="mt-8 flex w-full justify-center">
              <Link
                href="/threads"
                className="mx-3 flex h-7 flex-row items-center rounded-md border border-gray-400 px-2 dark:border-gray-400 hover:dark:border-gray-100"
              >
                <span className="items-center truncate truncate px-3 dark:text-gray-400 hover:dark:text-gray-100">
                  {t('Ready to Prompt!')}
                </span>
              </Link>
            </p>
          </div>
          <div className="flex aspect-[4/3] flex-1 flex-col justify-center rounded-lg bg-gray-300 p-3 p-3 dark:bg-gray-800">
            <div className="m-4 flex w-full justify-center">
              <div className="aspect-[4/3]">
                <Image width={96} height={96} className="" src="/logo.png" alt="logo" />
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 pt-8">
          <div className="h-center w-full text-xl font-extrabold">{t('Latest news')}</div>
          <div className="flex w-full flex-row justify-between gap-4">
            <Card />
            <Card />
            <Card />
            <Card />
          </div>
        </div>
        <div className="p-4 pt-8">
          <div className="h-center w-full text-xl font-extrabold">{t('Latest contributions')}</div>
          <div className="flex w-full flex-row justify-between gap-4">
            <Card />
            <Card />
            <Card />
            <Card />
          </div>
        </div>
      </main>
      <footer className="absolute bottom-0 flex w-full justify-between bg-gray-100 p-3 dark:bg-gray-950">
        <p className="flex text-center">
          <a href="https://github.com/Opla/opla" target="_blank" className="flex items-center">
            <BiLogoGithub />
            <span className="ml-2">{t('Contribute')}</span>
          </a>
          <a href="https://discord.gg/RJD4Xa2Y" target="_blank" className="ml-4 flex items-center">
            <BiLogoDiscordAlt />
            <span className="ml-2">{t('Community')}</span>
          </a>
        </p>
        <p className="text-sm font-light">{t('Made with ❤️ by the Opla community')}</p>
      </footer>
    </div>
  );
}
