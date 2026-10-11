extends Node3D
## Primeiro núcleo da nova edição: modelo .glb REAL + cenário 3D com assets CC0.
## O coelho importado é PROVISÓRIO e não tem rig de animação.
## Comportamento e progresso funcionam inteiramente offline.

const SAVE_PATH := "user://pipo_v2.json"
const ASSET_PATH := "res://assets/"
const ANIMAL_NAME := "pipo.glb"
const PROP_PATHS := [
	"TreeLow001.glb", "TreeMed001.glb", "Bush001.glb",
	"Rock001.glb", "Grass001.glb"
]

var camera: Camera3D
var pipo_anchor: Node3D
var pipo_model: Node3D
var pipo_area: Area3D
var status_text: Label
var prompt_text: Label
var hearts: int = 3
var energy: int = 3
var food: int = 3
var cheer_time: float = 0.0
var time_passed: float = 0.0
var touch_start: Vector2 = Vector2.ZERO


func _ready() -> void:
	_build_world()
	_build_garden()
	_build_pipo()
	_build_interface()
	_load_progress()
	_refresh_status()
	set_process(true)


func _build_world() -> void:
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#d2edf0")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#f9f7e6")
	env.ambient_light_energy = 0.9
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.environment = env
	add_child(environment)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -30, -15)
	sun.light_color = Color("#fff5da")
	sun.light_energy = 1.35
	sun.shadow_enabled = true
	add_child(sun)

	camera = Camera3D.new()
	camera.name = "CameraJardim"
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 12.4
	camera.position = Vector3(9, 11.5, 16)
	add_child(camera)
	camera.look_at(Vector3(0, 0.1, 0))
	camera.current = true

	# A plataforma é só o terreno: os objetos mais importantes são assets GLB.
	var grass_mat := StandardMaterial3D.new()
	grass_mat.albedo_color = Color("#9ac889")
	grass_mat.roughness = 1.0
	grass_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	var soil_mat := StandardMaterial3D.new()
	soil_mat.albedo_color = Color("#d9c38d")
	var earth := MeshInstance3D.new()
	earth.name = "IlhaTerra"
	var base := CylinderMesh.new()
	base.top_radius = 7.25
	base.bottom_radius = 7.0
	base.height = 0.7
	base.radial_segments = 64
	earth.mesh = base
	earth.material_override = soil_mat
	earth.position.y = -0.48
	add_child(earth)
	var ground := MeshInstance3D.new()
	ground.name = "Grama"
	var platform := CylinderMesh.new()
	platform.top_radius = 7.2
	platform.bottom_radius = 7.2
	platform.height = 0.1
	platform.radial_segments = 64
	ground.mesh = platform
	ground.material_override = grass_mat
	ground.position.y = -0.07
	add_child(ground)


func _instantiate_glb(name: String) -> Node3D:
	var path := ASSET_PATH + name
	if not ResourceLoader.exists(path):
		push_error("Asset GLB não importado: " + path)
		return null
	var scene := load(path) as PackedScene
	if scene == null:
		push_error("GLB não é uma cena válida: " + path)
		return null
	return scene.instantiate() as Node3D


func _build_garden() -> void:
	_place_prop("TreeMed001.glb", Vector3(-4.8, 0, -2.5), 1.6, -0.35)
	_place_prop("TreeLow001.glb", Vector3(5.0, 0, -3.1), 1.35, 0.7)
	_place_prop("TreeLow001.glb", Vector3(-4.3, 0, 3.6), 1.05, -0.5)
	_place_prop("TreeMed001.glb", Vector3(4.6, 0, 3.3), 1.2, 1.7)
	for i in 11:
		var angle := float(i) * TAU / 11.0
		_place_prop("Bush001.glb",
			Vector3(cos(angle) * 5.5, 0, sin(angle) * 5.5),
			0.74, angle)
	for i in 14:
		var a := float(i) * 2.4
		var rad := 3.2 + float(i % 4) * 0.57
		_place_prop("Grass001.glb",
			Vector3(cos(a) * rad, 0, sin(a) * rad), 0.82, a)
	for i in 6:
		var a := float(i) * TAU / 6.0
		_place_prop("Rock001.glb",
			Vector3(cos(a) * 6.4, 0, sin(a) * 6.4), 0.85, a)


func _place_prop(file: String, at: Vector3, size: float, spin: float) -> void:
	var instance := _instantiate_glb(file)
	if instance == null:
		return
	instance.name = "Decoracao_" + file.get_basename()
	instance.position = at
	instance.scale = Vector3.ONE * size
	instance.rotation.y = spin
	add_child(instance)


func _build_pipo() -> void:
	pipo_anchor = Node3D.new()
	pipo_anchor.name = "Pipo"
	pipo_anchor.position = Vector3(0, 0.08, 1.3)
	add_child(pipo_anchor)
	pipo_model = _instantiate_glb(ANIMAL_NAME)
	if pipo_model == null:
		return
	pipo_anchor.add_child(pipo_model)
	# Normalização real do volume do modelo importado, não reconstrução em primitivas.
	var region := _model_bounds(pipo_model)
	var diameter: float = maxf(maxf(region.size.x, region.size.y), region.size.z)
	var factor: float = 2.25 / maxf(0.01, diameter)
	pipo_model.scale = Vector3.ONE * factor
	pipo_model.position = Vector3(-region.get_center().x * factor,
		-region.position.y * factor, -region.get_center().z * factor)

	pipo_area = Area3D.new()
	pipo_area.name = "TocarPipo"
	pipo_area.collision_layer = 1
	pipo_area.collision_mask = 1
	var collision := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 1.4
	collision.shape = shape
	collision.position.y = 1.1
	pipo_area.add_child(collision)
	pipo_anchor.add_child(pipo_area)


func _model_bounds(root: Node3D) -> AABB:
	var bounds := AABB(Vector3.ZERO, Vector3.ZERO)
	var first := true
	for node in root.find_children("*", "MeshInstance3D", true, false):
		var mesh_instance := node as MeshInstance3D
		if mesh_instance.mesh == null:
			continue
		var own := root.global_transform.affine_inverse() * mesh_instance.global_transform
		var region := own * mesh_instance.get_aabb()
		if first:
			bounds = region
			first = false
		else:
			bounds = bounds.merge(region)
	if first:
		return AABB(Vector3(-0.5, 0, -0.5), Vector3.ONE)
	return bounds


func _ui_panel(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 22
	style.corner_radius_top_right = 22
	style.corner_radius_bottom_left = 22
	style.corner_radius_bottom_right = 22
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(1, 1, 1, 0.75)
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	return style


func _build_interface() -> void:
	var layer := CanvasLayer.new()
	layer.name = "Interface"
	add_child(layer)
	var root := Control.new()
	root.name = "HUD"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)

	var header := PanelContainer.new()
	header.set_anchors_preset(Control.PRESET_TOP_WIDE)
	header.offset_left = 14
	header.offset_top = 18
	header.offset_right = -14
	header.offset_bottom = 96
	header.add_theme_stylebox_override("panel", _ui_panel(Color("#fffbed")))
	root.add_child(header)
	var header_box := VBoxContainer.new()
	header_box.add_theme_constant_override("separation", 1)
	header.add_child(header_box)
	var title := Label.new()
	title.text = "Jardim da Sofia"
	title.add_theme_color_override("font_color", Color("#345f47"))
	title.add_theme_font_size_override("font_size", 24)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	header_box.add_child(title)
	status_text = Label.new()
	status_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_text.add_theme_color_override("font_color", Color("#6f845f"))
	status_text.add_theme_font_size_override("font_size", 15)
	header_box.add_child(status_text)

	var speech := PanelContainer.new()
	speech.set_anchors_preset(Control.PRESET_TOP_WIDE)
	speech.offset_left = 20
	speech.offset_right = -20
	speech.offset_top = 112
	speech.offset_bottom = 170
	speech.add_theme_stylebox_override("panel", _ui_panel(Color(1, 1, 0.96, 0.89)))
	root.add_child(speech)
	prompt_text = Label.new()
	prompt_text.name = "MensagemDoPipo"
	prompt_text.text = "Oi! Toque em mim para dar carinho."
	prompt_text.add_theme_color_override("font_color", Color("#3b6650"))
	prompt_text.add_theme_font_size_override("font_size", 16)
	prompt_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	speech.add_child(prompt_text)

	var footer := PanelContainer.new()
	footer.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	footer.offset_left = 14
	footer.offset_right = -14
	footer.offset_top = -108
	footer.offset_bottom = -14
	footer.add_theme_stylebox_override("panel", _ui_panel(Color("#fff9ec")))
	root.add_child(footer)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	footer.add_child(row)
	_action_button(row, "Carinho", "carinho", Color("#e9d8f4"))
	_action_button(row, "Comida", "comida", Color("#ffe5af"))
	_action_button(row, "Descansar", "dormir", Color("#d3e8f7"))


func _action_button(parent: Control, caption: String, action: String, tint: Color) -> void:
	var button := Button.new()
	button.text = caption
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.custom_minimum_size = Vector2(90, 60)
	button.add_theme_font_size_override("font_size", 15)
	button.add_theme_color_override("font_color", Color("#345b4b"))
	button.add_theme_stylebox_override("normal", _ui_panel(tint))
	button.add_theme_stylebox_override("hover", _ui_panel(tint.lightened(0.06)))
	button.add_theme_stylebox_override("pressed", _ui_panel(tint.darkened(0.08)))
	button.pressed.connect(_on_action.bind(action))
	parent.add_child(button)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed:
		touch_start = event.position
	elif event is InputEventScreenTouch and not event.pressed:
		if event.position.distance_to(touch_start) < 24:
			_check_pipo_touch(event.position)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_check_pipo_touch(event.position)


func _check_pipo_touch(screen_position: Vector2) -> void:
	if camera == null or pipo_area == null:
		return
	var start := camera.project_ray_origin(screen_position)
	var direction := camera.project_ray_normal(screen_position)
	var params := PhysicsRayQueryParameters3D.create(start, start + direction * 100.0)
	params.collide_with_areas = true
	var hit := get_world_3d().direct_space_state.intersect_ray(params)
	if hit.get("collider") == pipo_area:
		_on_action("carinho")


func _on_action(action: String) -> void:
	match action:
		"carinho":
			hearts = mini(5, hearts + 1)
			cheer_time = 1.2
			prompt_text.text = "O Pipo gostou do carinho!"
		"comida":
			food = mini(5, food + 1)
			hearts = mini(5, hearts + 1)
			cheer_time = 0.8
			prompt_text.text = "Nhac! Uma refeição deliciosa."
		"dormir":
			energy = 5
			cheer_time = 0.0
			prompt_text.text = "O Pipo está descansando no jardim."
	_refresh_status()
	_save_progress()


func _refresh_status() -> void:
	if status_text:
		status_text.text = "Carinho %d/5     Comida %d/5     Energia %d/5" % [hearts, food, energy]


func _process(delta: float) -> void:
	if pipo_anchor == null:
		return
	time_passed += delta
	if cheer_time > 0.0:
		cheer_time -= delta
		pipo_anchor.position.y = 0.08 + absf(sin(time_passed * 11.0)) * 0.2
		pipo_anchor.rotation.y = sin(time_passed * 7.0) * 0.2
	else:
		pipo_anchor.position.y = 0.08 + sin(time_passed * 2.1) * 0.035
		pipo_anchor.rotation.y = sin(time_passed * 0.5) * 0.07


func _load_progress() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return
	var decoded: Variant = JSON.parse_string(f.get_as_text())
	if not decoded is Dictionary:
		return
	var data: Dictionary = decoded
	hearts = clampi(int(data.get("hearts", 3)), 0, 5)
	food = clampi(int(data.get("food", 3)), 0, 5)
	energy = clampi(int(data.get("energy", 3)), 0, 5)


func _save_progress() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify({"hearts": hearts, "food": food, "energy": energy}))
