'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface OffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  offers?: string[];
  productName: string;
}

export default function OffersModal({ isOpen, onClose, offers = [], productName }: OffersModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-2"
                >
                  Available Offers
                  <span className="block text-sm text-gray-500 font-normal mt-1 truncate">
                    {productName}
                  </span>
                </Dialog.Title>
                
                <div className="mt-4 max-h-60 overflow-y-auto">
                  {offers && offers.length > 0 ? (
                    <ul className="space-y-3">
                      {offers.map((offer, index) => (
                        <li 
                          key={index} 
                          className="bg-indigo-50 border border-indigo-100 rounded-md p-3 text-sm text-gray-800 flex"
                        >
                          <span className="text-indigo-500 mr-2 flex-shrink-0 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.707.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 8l-3.293-3.293A1 1 0 0112 4z" clipRule="evenodd" />
                            </svg>
                          </span>
                          {offer}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-6">
                      <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 12H4m16 0l-4 4m4-4l-4-4" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No offers available</p>
                      <p className="mt-1 text-xs text-gray-400">Try using the &quot;Sync Offers&quot; button in the Scanner page</p>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 w-full"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 