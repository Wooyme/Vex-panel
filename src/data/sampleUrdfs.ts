export interface SampleUrdf {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
}

export const SAMPLE_URDFS: SampleUrdf[] = [
  {
    id: 'quadruped_robot',
    name: 'Quadruped Robot (四足机器人)',
    category: 'Four-Legged',
    description: '12-DOF Quadruped robot body with trunk, 4 hips, thighs, and calfs.',
    content: `<?xml version="1.0"?>
<robot name="quadruped_bot">
  <!-- Base Trunk / Body -->
  <link name="base_link">
    <visual>
      <origin xyz="0 0 0" rpy="0 0 0"/>
      <geometry>
        <box size="0.48 0.22 0.12"/>
      </geometry>
      <material name="chassis_mat">
        <color rgba="0.14 0.18 0.14 1.0"/>
      </material>
    </visual>
  </link>

  <!-- Front Left Hip -->
  <link name="fl_hip">
    <visual>
      <origin xyz="0 0 0" rpy="1.5707 0 0"/>
      <geometry>
        <cylinder length="0.08" radius="0.045"/>
      </geometry>
      <material name="joint_mat">
        <color rgba="0.96 0.62 0.07 1.0"/>
      </material>
    </visual>
  </link>
  <joint name="fl_hip_joint" type="revolute">
    <parent link="base_link"/>
    <child link="fl_hip"/>
    <origin xyz="0.18 0.13 0" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-0.8" upper="0.8" effort="20" velocity="10"/>
  </joint>

  <!-- Front Left Thigh -->
  <link name="fl_thigh">
    <visual>
      <origin xyz="0 0.02 -0.1" rpy="0 0 0"/>
      <geometry>
        <box size="0.04 0.04 0.22"/>
      </geometry>
      <material name="limb_mat">
        <color rgba="0.18 0.24 0.18 1.0"/>
      </material>
    </visual>
  </link>
  <joint name="fl_thigh_joint" type="revolute">
    <parent link="fl_hip"/>
    <child link="fl_thigh"/>
    <origin xyz="0 0.04 0" rpy="0 0.4 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.5" upper="1.5" effort="20" velocity="10"/>
  </joint>

  <!-- Front Left Calf -->
  <link name="fl_calf">
    <visual>
      <origin xyz="0 0 -0.11" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.22" radius="0.02"/>
      </geometry>
      <material name="carbon_mat">
        <color rgba="0.1 0.12 0.1 1.0"/>
      </material>
    </visual>
  </link>
  <joint name="fl_calf_joint" type="revolute">
    <parent link="fl_thigh"/>
    <child link="fl_calf"/>
    <origin xyz="0 0.02 -0.2" rpy="0 -0.8 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.5" upper="0" effort="20" velocity="10"/>
  </joint>

  <!-- Front Right Hip -->
  <link name="fr_hip">
    <visual>
      <origin xyz="0 0 0" rpy="1.5707 0 0"/>
      <geometry>
        <cylinder length="0.08" radius="0.045"/>
      </geometry>
      <material name="joint_mat"/>
    </visual>
  </link>
  <joint name="fr_hip_joint" type="revolute">
    <parent link="base_link"/>
    <child link="fr_hip"/>
    <origin xyz="0.18 -0.13 0" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-0.8" upper="0.8" effort="20" velocity="10"/>
  </joint>

  <!-- Front Right Thigh -->
  <link name="fr_thigh">
    <visual>
      <origin xyz="0 -0.02 -0.1" rpy="0 0 0"/>
      <geometry>
        <box size="0.04 0.04 0.22"/>
      </geometry>
      <material name="limb_mat"/>
    </visual>
  </link>
  <joint name="fr_thigh_joint" type="revolute">
    <parent link="fr_hip"/>
    <child link="fr_thigh"/>
    <origin xyz="0 -0.04 0" rpy="0 0.4 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.5" upper="1.5" effort="20" velocity="10"/>
  </joint>

  <!-- Front Right Calf -->
  <link name="fr_calf">
    <visual>
      <origin xyz="0 0 -0.11" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.22" radius="0.02"/>
      </geometry>
      <material name="carbon_mat"/>
    </visual>
  </link>
  <joint name="fr_calf_joint" type="revolute">
    <parent link="fr_thigh"/>
    <child link="fr_calf"/>
    <origin xyz="0 -0.02 -0.2" rpy="0 -0.8 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.5" upper="0" effort="20" velocity="10"/>
  </joint>

  <!-- Rear Left Hip -->
  <link name="rl_hip">
    <visual>
      <origin xyz="0 0 0" rpy="1.5707 0 0"/>
      <geometry>
        <cylinder length="0.08" radius="0.045"/>
      </geometry>
      <material name="joint_mat"/>
    </visual>
  </link>
  <joint name="rl_hip_joint" type="revolute">
    <parent link="base_link"/>
    <child link="rl_hip"/>
    <origin xyz="-0.18 0.13 0" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-0.8" upper="0.8" effort="20" velocity="10"/>
  </joint>

  <!-- Rear Left Thigh -->
  <link name="rl_thigh">
    <visual>
      <origin xyz="0 0.02 -0.1" rpy="0 0 0"/>
      <geometry>
        <box size="0.04 0.04 0.22"/>
      </geometry>
      <material name="limb_mat"/>
    </visual>
  </link>
  <joint name="rl_thigh_joint" type="revolute">
    <parent link="rl_hip"/>
    <child link="rl_thigh"/>
    <origin xyz="0 0.04 0" rpy="0 -0.4 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.5" upper="1.5" effort="20" velocity="10"/>
  </joint>

  <!-- Rear Left Calf -->
  <link name="rl_calf">
    <visual>
      <origin xyz="0 0 -0.11" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.22" radius="0.02"/>
      </geometry>
      <material name="carbon_mat"/>
    </visual>
  </link>
  <joint name="rl_calf_joint" type="revolute">
    <parent link="rl_thigh"/>
    <child link="rl_calf"/>
    <origin xyz="0 0.02 -0.2" rpy="0 0.8 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="0" upper="2.5" effort="20" velocity="10"/>
  </joint>

  <!-- Rear Right Hip -->
  <link name="rr_hip">
    <visual>
      <origin xyz="0 0 0" rpy="1.5707 0 0"/>
      <geometry>
        <cylinder length="0.08" radius="0.045"/>
      </geometry>
      <material name="joint_mat"/>
    </visual>
  </link>
  <joint name="rr_hip_joint" type="revolute">
    <parent link="base_link"/>
    <child link="rr_hip"/>
    <origin xyz="-0.18 -0.13 0" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-0.8" upper="0.8" effort="20" velocity="10"/>
  </joint>

  <!-- Rear Right Thigh -->
  <link name="rr_thigh">
    <visual>
      <origin xyz="0 -0.02 -0.1" rpy="0 0 0"/>
      <geometry>
        <box size="0.04 0.04 0.22"/>
      </geometry>
      <material name="limb_mat"/>
    </visual>
  </link>
  <joint name="rr_thigh_joint" type="revolute">
    <parent link="rr_hip"/>
    <child link="rr_thigh"/>
    <origin xyz="0 -0.04 0" rpy="0 -0.4 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.5" upper="1.5" effort="20" velocity="10"/>
  </joint>

  <!-- Rear Right Calf -->
  <link name="rr_calf">
    <visual>
      <origin xyz="0 0 -0.11" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.22" radius="0.02"/>
      </geometry>
      <material name="carbon_mat"/>
    </visual>
  </link>
  <joint name="rr_calf_joint" type="revolute">
    <parent link="rr_thigh"/>
    <child link="rr_calf"/>
    <origin xyz="0 -0.02 -0.2" rpy="0 0.8 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="0" upper="2.5" effort="20" velocity="10"/>
  </joint>
</robot>`,
  },
  {
    id: 'robotic_arm_6dof',
    name: '6-DOF Robotic Arm (六轴机械臂)',
    category: 'Manipulator',
    description: 'Industrial 6-axis articulated robotic manipulator with base, shoulder, elbow, and wrist.',
    content: `<?xml version="1.0"?>
<robot name="arm_6dof">
  <!-- Base Pedestal -->
  <link name="base_link">
    <visual>
      <origin xyz="0 0 0.05" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.1" radius="0.12"/>
      </geometry>
      <material name="dark_base">
        <color rgba="0.12 0.15 0.12 1.0"/>
      </material>
    </visual>
  </link>

  <!-- Link 1: Shoulder Rotation -->
  <link name="link_1">
    <visual>
      <origin xyz="0 0 0.08" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.16" radius="0.07"/>
      </geometry>
      <material name="amber_joint">
        <color rgba="0.96 0.62 0.07 1.0"/>
      </material>
    </visual>
  </link>
  <joint name="joint_1" type="revolute">
    <parent link="base_link"/>
    <child link="link_1"/>
    <origin xyz="0 0 0.1" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14" upper="3.14" effort="50" velocity="2"/>
  </joint>

  <!-- Link 2: Upper Arm -->
  <link name="link_2">
    <visual>
      <origin xyz="0 0 0.2" rpy="0 0 0"/>
      <geometry>
        <box size="0.08 0.08 0.4"/>
      </geometry>
      <material name="arm_link">
        <color rgba="0.2 0.28 0.2 1.0"/>
      </material>
    </visual>
  </link>
  <joint name="joint_2" type="revolute">
    <parent link="link_1"/>
    <child link="link_2"/>
    <origin xyz="0 0 0.16" rpy="0 0.4 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.8" upper="1.8" effort="50" velocity="2"/>
  </joint>

  <!-- Link 3: Forearm -->
  <link name="link_3">
    <visual>
      <origin xyz="0 0 0.18" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.36" radius="0.045"/>
      </geometry>
      <material name="arm_link"/>
    </visual>
  </link>
  <joint name="joint_3" type="revolute">
    <parent link="link_2"/>
    <child link="link_3"/>
    <origin xyz="0 0 0.4" rpy="0 -0.8 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.5" upper="2.5" effort="30" velocity="3"/>
  </joint>

  <!-- Link 4: Wrist Pitch -->
  <link name="link_4">
    <visual>
      <origin xyz="0 0 0.05" rpy="0 0 0"/>
      <geometry>
        <sphere radius="0.05"/>
      </geometry>
      <material name="amber_joint"/>
    </visual>
  </link>
  <joint name="joint_4" type="revolute">
    <parent link="link_3"/>
    <child link="link_4"/>
    <origin xyz="0 0 0.36" rpy="0 0.4 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.0" upper="2.0" effort="15" velocity="4"/>
  </joint>

  <!-- Link 5: End Effector Gripper Base -->
  <link name="gripper_base">
    <visual>
      <origin xyz="0 0 0.04" rpy="0 0 0"/>
      <geometry>
        <box size="0.08 0.04 0.06"/>
      </geometry>
      <material name="dark_base"/>
    </visual>
  </link>
  <joint name="joint_5" type="revolute">
    <parent link="link_4"/>
    <child link="gripper_base"/>
    <origin xyz="0 0 0.08" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14" upper="3.14" effort="10" velocity="5"/>
  </joint>
</robot>`,
  },
  {
    id: 'biped_humanoid',
    name: 'Biped Humanoid Legs (双足机器人下肢)',
    category: 'Humanoid',
    description: 'Bipedal walking robot pelvis and legs with hip, knee, and ankle joints.',
    content: `<?xml version="1.0"?>
<robot name="biped_legs">
  <!-- Pelvis -->
  <link name="pelvis">
    <visual>
      <origin xyz="0 0 0" rpy="0 0 0"/>
      <geometry>
        <box size="0.22 0.28 0.12"/>
      </geometry>
      <material name="pelvis_mat">
        <color rgba="0.14 0.18 0.14 1.0"/>
      </material>
    </visual>
  </link>

  <!-- Left Hip -->
  <link name="l_hip">
    <visual>
      <origin xyz="0 0 0" rpy="0 0 0"/>
      <geometry>
        <sphere radius="0.045"/>
      </geometry>
      <material name="amber_joint">
        <color rgba="0.96 0.62 0.07 1.0"/>
      </material>
    </visual>
  </link>
  <joint name="l_hip_joint" type="revolute">
    <parent link="pelvis"/>
    <child link="l_hip"/>
    <origin xyz="0 0.1 -0.06" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-0.6" upper="0.6" effort="40" velocity="5"/>
  </joint>

  <!-- Left Thigh -->
  <link name="l_thigh">
    <visual>
      <origin xyz="0 0 -0.15" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.3" radius="0.035"/>
      </geometry>
      <material name="limb_mat">
        <color rgba="0.2 0.26 0.2 1.0"/>
      </material>
    </visual>
  </link>
  <joint name="l_thigh_joint" type="revolute">
    <parent link="l_hip"/>
    <child link="l_thigh"/>
    <origin xyz="0 0 0" rpy="0 0.2 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.2" upper="1.2" effort="40" velocity="5"/>
  </joint>

  <!-- Left Shin -->
  <link name="l_shin">
    <visual>
      <origin xyz="0 0 -0.15" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.3" radius="0.03"/>
      </geometry>
      <material name="carbon_mat">
        <color rgba="0.1 0.12 0.1 1.0"/>
      </material>
    </visual>
  </link>
  <joint name="l_knee_joint" type="revolute">
    <parent link="l_thigh"/>
    <child link="l_shin"/>
    <origin xyz="0 0 -0.3" rpy="0 -0.4 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.2" upper="0" effort="40" velocity="5"/>
  </joint>

  <!-- Left Foot -->
  <link name="l_foot">
    <visual>
      <origin xyz="0.04 0 -0.02" rpy="0 0 0"/>
      <geometry>
        <box size="0.18 0.09 0.04"/>
      </geometry>
      <material name="amber_joint"/>
    </visual>
  </link>
  <joint name="l_ankle_joint" type="revolute">
    <parent link="l_shin"/>
    <child link="l_foot"/>
    <origin xyz="0 0 -0.3" rpy="0 0.2 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-0.8" upper="0.8" effort="20" velocity="5"/>
  </joint>

  <!-- Right Hip -->
  <link name="r_hip">
    <visual>
      <origin xyz="0 0 0" rpy="0 0 0"/>
      <geometry>
        <sphere radius="0.045"/>
      </geometry>
      <material name="amber_joint"/>
    </visual>
  </link>
  <joint name="r_hip_joint" type="revolute">
    <parent link="pelvis"/>
    <child link="r_hip"/>
    <origin xyz="0 -0.1 -0.06" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-0.6" upper="0.6" effort="40" velocity="5"/>
  </joint>

  <!-- Right Thigh -->
  <link name="r_thigh">
    <visual>
      <origin xyz="0 0 -0.15" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.3" radius="0.035"/>
      </geometry>
      <material name="limb_mat"/>
    </visual>
  </link>
  <joint name="r_thigh_joint" type="revolute">
    <parent link="r_hip"/>
    <child link="r_thigh"/>
    <origin xyz="0 0 0" rpy="0 -0.2 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.2" upper="1.2" effort="40" velocity="5"/>
  </joint>

  <!-- Right Shin -->
  <link name="r_shin">
    <visual>
      <origin xyz="0 0 -0.15" rpy="0 0 0"/>
      <geometry>
        <cylinder length="0.3" radius="0.03"/>
      </geometry>
      <material name="carbon_mat"/>
    </visual>
  </link>
  <joint name="r_knee_joint" type="revolute">
    <parent link="r_thigh"/>
    <child link="r_shin"/>
    <origin xyz="0 0 -0.3" rpy="0 -0.4 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.2" upper="0" effort="40" velocity="5"/>
  </joint>

  <!-- Right Foot -->
  <link name="r_foot">
    <visual>
      <origin xyz="0.04 0 -0.02" rpy="0 0 0"/>
      <geometry>
        <box size="0.18 0.09 0.04"/>
      </geometry>
      <material name="amber_joint"/>
    </visual>
  </link>
  <joint name="r_ankle_joint" type="revolute">
    <parent link="r_shin"/>
    <child link="r_foot"/>
    <origin xyz="0 0 -0.3" rpy="0 0.6 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-0.8" upper="0.8" effort="20" velocity="5"/>
  </joint>
</robot>`,
  },
];
