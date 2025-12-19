export interface UserWithRole {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: {
    id: string;
    name: string;
    display_name: string;
  };
}

