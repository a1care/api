import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminUser, AdminRole } from "@/types";

export function AdminManagementPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");

  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/admin/users");
      return (res.data.data as any[]).map((item) => ({
        id: item.id ?? item._id,
        name: item.name,
        email: item.email,
        role: item.role
      })) as AdminUser[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/users", { name, email, password, role });
    },
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      setRole("admin");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    }
  });

  return (
    <section>
      <h1>Admin Management</h1>
      <div className="grid two-col">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <h2>Create Admin</h2>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>
          <button className="button" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Admin"}
          </button>
        </form>

        <article className="card">
          <h2>Current Admins</h2>
          <ul className="list">
            {(data ?? []).map((item) => (
              <li key={item.id ?? item.email}>
                <strong>{item.name}</strong> - {item.email} - {item.role}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
