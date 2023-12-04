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

import Portal from '@/components/Portal';
import { createContext, useEffect, useState } from 'react';

type Context = {
  instances: {
    [key: string]: {
      render: (props: {
        name: string;
        visible: boolean;
        onClose: () => void;
        data: any;
      }) => React.ReactNode;
      visible: boolean;
      data: any;
    };
  };
  registerModal: (name: string, render: any, visible?: boolean, data?: any) => void;
  showModal: (modalName: string, data?: any) => void;
};

const initialContext: Context = {
  instances: {},
  registerModal: () => {},
  showModal: () => {},
};

const ModalsContext = createContext(initialContext);

function ModalsProvider({
  children,
  onInit = () => {},
}: {
  children: React.ReactNode;
  onInit?: (context: Context) => void;
}) {
  const [modals, setModals] = useState(initialContext.instances);

  const registerModal = (
    name: string,
    render: () => React.ReactNode,
    visible = false,
    data = undefined,
  ) => {
    if (!modals[name]) {
      setModals((prevModals) => ({ ...prevModals, ...{ [name]: { render, visible, data } } }));
    }
  };

  const showModal = (name: string, data = undefined) => {
    const instance = modals[name];

    if (instance) {
      setModals((prevModals) => ({
        ...prevModals,
        ...{ [name]: { ...instance, visible: true, data } },
      }));
    }
  };

  const onClose = (name: string) => {
    const instance = modals[name];
    if (instance) {
      setModals((prevModals) => ({
        ...prevModals,
        ...{ [name]: { ...instance, visible: false, data: undefined } },
      }));
    }
  };

  useEffect(() => {
    onInit({ registerModal, showModal } as Context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ModalsContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{ instances: modals, registerModal, showModal }}
    >
      {children}
      <Portal>
        {Object.entries(modals).map(([name, { render, visible, data }]) =>
          render({ name, visible, onClose: () => onClose(name), data }),
        )}
      </Portal>
    </ModalsContext.Provider>
  );
}

export { ModalsContext, ModalsProvider };
