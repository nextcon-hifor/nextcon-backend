// src/common/entities/base.entity.ts
import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Column,
    BeforeInsert,
    BeforeUpdate,
  } from 'typeorm';
  
  export abstract class BaseEntity {
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @Column({ default: 0 })
    createdById: number;
  
    @Column({ default: 0})
    updatedById: number;
  
    @BeforeInsert()
    setCreatedBy() {
      // 나중에 RequestContext 등으로 동적으로 처리 가능
      this.createdById = 0; // 추후 로그인 유저로 바꾸기
      this.updatedById = 0;
    }
  
    @BeforeUpdate()
    setUpdatedBy() {
      this.updatedById = 0; // 추후 로그인 유저로 바꾸기
    }
  }
  