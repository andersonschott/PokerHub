**Sheet** — the bottom-sheet that carries every confirmation and table action. On mobile this replaces center dialogs entirely.

```jsx
<Sheet open={open} onClose={close}
  leading={<Avatar name="Bruno Lima" />}
  title="Bruno Lima"
  subtitle="Stack inicial · sem rebuys">
  <div style={{display:'grid', gap:8}}>
    <Button variant="outline" icon="user-plus" block>Check-in</Button>
    <Button variant="secondary" icon="repeat" block>Rebuy (+R$ 50)</Button>
    <Button variant="destructive" icon="skull" block>Eliminar</Button>
  </div>
</Sheet>
```

Inside a phone-frame mock keep the default (absolute, fills the frame). Pass `fixed` for a real full-viewport app.
