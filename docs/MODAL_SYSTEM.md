# Global Modal System

This project implements a global modal management system that allows you to open LoginModal and SignupModal from any component in the application.

## Architecture

### 1. ModalContext (`contexts/ModalContext.tsx`)

- Manages global modal state
- Provides functions to show/hide modals
- Handles switching between login and signup modals

### 2. GlobalModals (`components/GlobalModals.tsx`)

- Renders the actual modal components
- Listens to modal context state
- Placed at the app level for global accessibility

### 3. ModalProvider (`app/_layout.tsx`)

- Wraps the entire app to provide modal context
- Ensures modal state is available everywhere

## Usage

### Import the hook

```tsx
import { useModal } from "@/contexts/ModalContext";
```

### Use in any component

```tsx
export const MyComponent: React.FC = () => {
  const { showLoginModal, showSignupModal, hideModal, currentModal } =
    useModal();

  return (
    <View>
      <TouchableOpacity onPress={showLoginModal}>
        <Text>Open Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={showSignupModal}>
        <Text>Open Signup</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={hideModal}>
        <Text>Close Modal</Text>
      </TouchableOpacity>

      {currentModal && <Text>Current modal: {currentModal}</Text>}
    </View>
  );
};
```

## Available Functions

| Function            | Description                                     |
| ------------------- | ----------------------------------------------- |
| `showLoginModal()`  | Opens the login modal                           |
| `showSignupModal()` | Opens the signup modal                          |
| `hideModal()`       | Closes any open modal                           |
| `switchToLogin()`   | Switches from signup to login modal             |
| `switchToSignup()`  | Switches from login to signup modal             |
| `currentModal`      | Current modal state: 'login', 'signup', or null |

## Example Components

### Simple Button Component

```tsx
import { useModal } from "@/contexts/ModalContext";

const AuthButtons = () => {
  const { showLoginModal, showSignupModal } = useModal();

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Button title="Login" onPress={showLoginModal} />
      <Button title="Sign Up" onPress={showSignupModal} />
    </View>
  );
};
```

### Header Component with Auth

```tsx
import { useModal } from "@/contexts/ModalContext";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const { user } = useAuth();
  const { showLoginModal } = useModal();

  return (
    <View style={styles.header}>
      <Text>JobPortal</Text>
      {!user && (
        <TouchableOpacity onPress={showLoginModal}>
          <Text>Login</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

### Settings Screen

```tsx
import { useModal } from "@/contexts/ModalContext";

const SettingsScreen = () => {
  const { showLoginModal, showSignupModal } = useModal();

  return (
    <ScrollView>
      <Text>Settings</Text>

      <TouchableOpacity onPress={showLoginModal}>
        <Text>Switch Account</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={showSignupModal}>
        <Text>Create New Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

## Benefits

1. **Global Accessibility**: Open modals from any component without prop drilling
2. **Centralized State**: Single source of truth for modal state
3. **Consistent UX**: Modals behave the same way regardless of where they're opened
4. **Easy Switching**: Built-in functions to switch between login and signup
5. **Clean Architecture**: Separation of concerns between modal logic and UI

## Files Modified

- `contexts/ModalContext.tsx` - New context for modal management
- `components/GlobalModals.tsx` - New component that renders modals
- `app/_layout.tsx` - Added ModalProvider and GlobalModals
- `app/index.tsx` - Updated to use global modal system

## Migration from Local State

Before (local state):

```tsx
const [showLoginModal, setShowLoginModal] = useState(false);

<TouchableOpacity onPress={() => setShowLoginModal(true)}>
  <Text>Login</Text>
</TouchableOpacity>

<LoginModal
  visible={showLoginModal}
  onClose={() => setShowLoginModal(false)}
/>
```

After (global modal system):

```tsx
const { showLoginModal } = useModal();

<TouchableOpacity onPress={showLoginModal}>
  <Text>Login</Text>
</TouchableOpacity>;

// No need to render LoginModal - it's handled globally
```
